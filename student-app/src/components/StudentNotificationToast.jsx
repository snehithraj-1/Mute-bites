import React, { useState, useEffect, useRef } from 'react';
import { ChefHat, PackageCheck, CheckCheck, X, ArrowRight, Bell, Sparkles, CheckCircle2, Phone } from 'lucide-react';
import { playStudentChime, sendStudentNotification, requestStudentNotificationPermission, unlockStudentAudio } from '../lib/notificationSound';
import { useStudentAuth } from '../context/StudentAuthContext';

const STATUS_DETAILS = {
  CONFIRMED: {
    title: 'Order Confirmed! 👨‍🍳',
    desc: 'The restaurant has confirmed your order and started cooking.',
    icon: CheckCircle2,
    bg: 'bg-white border-2 border-emerald-400 text-emerald-950 shadow-emerald-500/20',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  PREPARING: {
    title: 'Cooking in Progress! 🍳',
    desc: 'The kitchen chefs are preparing your fresh campus meal.',
    icon: ChefHat,
    bg: 'bg-white border-2 border-amber-400 text-amber-950 shadow-amber-500/20',
    badge: 'bg-amber-100 text-amber-800'
  },
  READY: {
    title: 'Order Ready for Pickup! 📦',
    desc: 'Your food parcel is packed and waiting for delivery dispatch.',
    icon: PackageCheck,
    bg: 'bg-white border-2 border-cyan-400 text-cyan-950 shadow-cyan-500/20',
    badge: 'bg-cyan-100 text-cyan-800'
  },

  COMPLETED: {
    title: 'Order Completed! 🎉',
    desc: 'Your order has been completed by the restaurant. Enjoy your meal!',
    icon: CheckCheck,
    bg: 'bg-white border-2 border-emerald-500 text-emerald-950 shadow-emerald-500/30',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  DELIVERED: {
    title: 'Order Completed! 🎉',
    desc: 'Your order has been completed by the restaurant. Enjoy your meal!',
    icon: CheckCheck,
    bg: 'bg-white border-2 border-emerald-500 text-emerald-950 shadow-emerald-500/30',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  CANCELLED: {
    title: 'Order Cancelled',
    desc: 'Your order has been cancelled.',
    icon: X,
    bg: 'bg-white border-2 border-rose-300 text-rose-950 shadow-rose-500/20',
    badge: 'bg-rose-100 text-rose-800'
  }
};

function getNotifiedStages() {
  try {
    return JSON.parse(sessionStorage.getItem('cb_student_notified_stages') || '{}');
  } catch {
    return {};
  }
}

function saveNotifiedStage(orderId, stage) {
  try {
    const current = getNotifiedStages();
    if (!current[orderId]) current[orderId] = [];
    if (!current[orderId].includes(stage)) {
      current[orderId].push(stage);
    }
    sessionStorage.setItem('cb_student_notified_stages', JSON.stringify(current));
  } catch {}
}

export default function StudentNotificationToast({ onTrackOrder, activeOrderId }) {
  const { profile } = useStudentAuth();
  const [activeToast, setActiveToast] = useState(null);
  const isFirstPollRef = useRef(true);

  // Request browser notification permission and unlock audio context on interaction
  useEffect(() => {
    const handleUnlock = () => {
      unlockStudentAudio();
      requestStudentNotificationPermission();
    };
    ['click', 'pointerdown', 'touchstart', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, handleUnlock, { passive: true, once: true });
    });
  }, []);

  // Poll orders every 2 seconds for status changes
  useEffect(() => {
    let isMounted = true;

    async function checkOrderStatusChanges() {
      try {
        const localOrders = JSON.parse(localStorage.getItem('cb_shared_orders') || '[]');
        const localIds = new Set(localOrders.map((o) => o.id));
        if (activeOrderId) localIds.add(activeOrderId);

        const identifier = profile?.email || profile?.phone || profile?.id || '';
        const ordersMap = new Map();

        // 1. Fetch student orders by identifier if profile exists
        if (identifier) {
          try {
            const res = await fetch(`/api/orders/student/${encodeURIComponent(identifier)}`);
            if (res.ok) {
              const data = await res.json();
              (data.orders || []).forEach((o) => ordersMap.set(o.id, o));
            }
          } catch {}
        }

        // 2. Also fetch recent orders from live API to ensure any local order is tracked
        try {
          const allRes = await fetch('/api/orders');
          if (allRes.ok) {
            const allData = await allRes.json();
            const ordersList = Array.isArray(allData) ? allData : (allData.orders || []);
            ordersList.forEach((o) => {
              const isLocalMatch = localIds.has(o.id) || localOrders.some((lo) => lo.id === o.id || (lo.id && o.id && (lo.id.includes(o.id) || o.id.includes(lo.id))));
              const guestPhone = JSON.parse(localStorage.getItem('cb_delivery_details') || '{}')?.phone || '';
              const sPhone = String(o.student_phone || '').replace(/\D/g, '').slice(-10);
              const pPhone = String(profile?.phone || guestPhone || '').replace(/\D/g, '').slice(-10);
              const isPhoneMatch = Boolean(pPhone && sPhone && sPhone === pPhone);
              const pEmail = (profile?.email || '').trim().toLowerCase();
              const sEmail = (o.student_email || '').trim().toLowerCase();
              const isEmailMatch = Boolean(pEmail && sEmail && sEmail === pEmail);
              
              if (isLocalMatch || isEmailMatch || isPhoneMatch) {
                ordersMap.set(o.id, o);
              }
            });
          }
        } catch {}

        // 3. Specifically poll activeOrderId if provided
        if (activeOrderId && !ordersMap.has(activeOrderId)) {
          try {
            let singleRes = await fetch(`/api/orders/${encodeURIComponent(activeOrderId)}`);
            if (!singleRes.ok) {
              singleRes = await fetch(`/api/orders?id=${encodeURIComponent(activeOrderId)}`);
            }
            if (singleRes.ok) {
              const singleData = await singleRes.json();
              const singleOrder = singleData.order || (singleData.id === activeOrderId ? singleData : null) || (Array.isArray(singleData.orders) ? singleData.orders.find(o => o.id === activeOrderId) : null);
              if (singleOrder) {
                ordersMap.set(singleOrder.id, singleOrder);
              }
            }
          } catch {}
        }

        const orders = Array.from(ordersMap.values());
        const notifiedStages = getNotifiedStages();

        // On initial component mount, seed older completed orders so we don't alert on yesterday's orders
        if (isFirstPollRef.current) {
          orders.forEach((o) => {
            const ageMs = Date.now() - new Date(o.created_at || Date.now()).getTime();
            // If order was completed over 30 mins ago, treat as already notified
            if ((o.status === 'COMPLETED' || o.status === 'DELIVERED') && ageMs > 30 * 60 * 1000) {
              saveNotifiedStage(o.id, 'COMPLETED');
              saveNotifiedStage(o.id, 'DELIVERED');
            }
          });
          isFirstPollRef.current = false;
        }

        // Process each order for real-time status transitions
        for (const order of orders) {
          const alreadyNotified = notifiedStages[order.id] || [];
          const orderStatus = order.status || 'CONFIRMED';

          // 1. Completed / Delivered transition
          if ((orderStatus === 'COMPLETED' || orderStatus === 'DELIVERED') && !alreadyNotified.includes('COMPLETED') && !alreadyNotified.includes('DELIVERED')) {
            saveNotifiedStage(order.id, 'COMPLETED');
            saveNotifiedStage(order.id, 'DELIVERED');

            // Sync updated status to localStorage
            try {
              const stored = JSON.parse(localStorage.getItem('cb_shared_orders') || '[]');
              const updated = stored.map((o) =>
                o.id === order.id ? { 
                  ...o, 
                  status: 'COMPLETED'
                } : o
              );
              localStorage.setItem('cb_shared_orders', JSON.stringify(updated));
            } catch {}

            if (isMounted) {
              const desc = `Your meal from ${order.restaurant_name || 'Kitchen'} has been completed! Enjoy your food.`;

              setActiveToast({
                order,
                status: 'COMPLETED',
                title: 'Order Completed! 🎉',
                desc,
                icon: CheckCheck,
                bg: 'bg-white border-2 border-emerald-500 text-emerald-950 shadow-emerald-500/30',
                badge: 'bg-emerald-100 text-emerald-800'
              });

              playStudentChime('DELIVERED');
              sendStudentNotification(
                'Order Completed! 🎉',
                `Order #${order.id}: ${desc}`
              );
            }
            break; // Show this toast first
          }
        }
      } catch (err) {
        // Silent catch for network hiccups
      }
    }

    checkOrderStatusChanges();
    const interval = setInterval(checkOrderStatusChanges, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [profile?.email, profile?.phone, profile?.id, activeOrderId]);

  // Auto-dismiss toast after 8 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  if (!activeToast) return null;

  const Icon = activeToast.icon;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-[80] max-w-sm w-full animate-slide-down">
      <div className={`p-4 rounded-2xl bg-white border shadow-2xl flex flex-col gap-3 relative overflow-hidden ${activeToast.bg}`}>
        
        {/* Animated Accent Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 animate-pulse ${
          activeToast.status === 'DELIVERED'
            ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
            : activeToast.status === 'OUT_FOR_DELIVERY'
            ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
            : 'bg-gradient-to-r from-[#E11D48] to-[#881337]'
        }`} />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl shadow-xs border flex items-center justify-center shrink-0 text-xl ${
              activeToast.status === 'DELIVERED'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : activeToast.status === 'OUT_FOR_DELIVERY'
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
              <Icon size={22} className={activeToast.status === 'OUT_FOR_DELIVERY' ? 'animate-bounce' : ''} />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${activeToast.badge}`}>
                  {activeToast.status.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-xs font-bold text-slate-400">
                  #{activeToast.order?.id?.slice(-8) || activeToast.order?.id}
                </span>
              </div>
              <h4 className="font-black text-sm font-['Outfit'] mt-1 text-[#0F172A] leading-snug">
                {activeToast.title}
              </h4>
              <p className="text-xs text-slate-600 font-medium mt-0.5 leading-relaxed">
                {activeToast.desc}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drop Point & Track Button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Drop: Vit-ap Campus</span>
          </div>

          {onTrackOrder && (
            <button
              onClick={() => {
                onTrackOrder(activeToast.order);
                setActiveToast(null);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-black text-[#9F1239] hover:text-[#881337] border-none bg-transparent cursor-pointer"
            >
              <span>Track Order</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
