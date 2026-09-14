import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, MapPin, ArrowRight, Home, Receipt, Phone, ShieldCheck, Printer, Clock, Store, Volume2, CheckCheck, Sparkles, AlertCircle } from 'lucide-react';
import { playStudentChime, sendStudentNotification, unlockStudentAudio } from '../lib/notificationSound';

export default function OrderSuccessPage({ order, onGoHome, onViewHistory }) {
  if (!order) return null;

  const [liveOrder, setLiveOrder] = useState(order);
  const [stageAlert, setStageAlert] = useState(null);
  const prevStatusRef = useRef(order.status || 'CONFIRMED');

  useEffect(() => {
    setLiveOrder(order);
  }, [order]);

  // Unlock audio on interaction
  useEffect(() => {
    const unlock = () => unlockStudentAudio();
    window.addEventListener('click', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
  }, []);

  const [orderDeleted, setOrderDeleted] = useState(false);
  const consecutive404Ref = useRef(0);

  // Poll for order status updates from Central API
  useEffect(() => {
    if (!order?.id) return;
    let isMounted = true;

    const poll = async () => {
      try {
        let res = await fetch(`/api/orders/${encodeURIComponent(order.id)}?_t=${Date.now()}`);
        if (!res.ok) {
          res = await fetch(`/api/orders?id=${encodeURIComponent(order.id)}&_t=${Date.now()}`);
        }
        if (res.status === 404) {
          consecutive404Ref.current += 1;
          // Only show deleted if persistently 404 for 5 consecutive polls (10+ seconds)
          if (consecutive404Ref.current >= 5 && isMounted) {
            setOrderDeleted(true);
          }
          return;
        }
        if (res.ok) {
          consecutive404Ref.current = 0;
          const data = await res.json();
          const targetOrder = data.order || (data.id === order.id ? data : null) || (Array.isArray(data.orders) ? data.orders.find(o => o.id === order.id) : null);
          if (targetOrder && isMounted) {
            const newStatus = targetOrder.status;
            const prevStatus = prevStatusRef.current;

            setLiveOrder(targetOrder);

            // Sync updated status to localStorage so OrderHistoryPage immediately reflects it
            try {
              const stored = JSON.parse(localStorage.getItem('cb_shared_orders') || '[]');
              const updated = stored.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o));
              localStorage.setItem('cb_shared_orders', JSON.stringify(updated));
            } catch {}

            // Detect real-time status transitions from Admin / Kitchen
            if (prevStatus && prevStatus !== newStatus) {
              prevStatusRef.current = newStatus;

              if (newStatus === 'COMPLETED' || newStatus === 'DELIVERED') {
                playStudentChime('DELIVERED');
                const msg = `Your meal from ${targetOrder.restaurant_name || 'Kitchen'} has been completed! Enjoy your food.`;
                setStageAlert({
                  type: 'COMPLETED',
                  title: 'Order Completed! 🎉',
                  message: msg
                });
                sendStudentNotification('🎉 Order Completed!', `Order #${order.id}: ${msg}`);
              }
            } else {
              prevStatusRef.current = newStatus;
            }
          }
        }
      } catch (e) {}
    };

    poll();
    const interval = setInterval(poll, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [order?.id]);

  if (orderDeleted) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-200 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-['Outfit']">Order Cancelled or Removed</h2>
        <p className="text-sm text-slate-600">This order has been cleared or cancelled by the restaurant management.</p>
        <button
          onClick={onGoHome}
          className="mt-4 px-6 py-2.5 bg-gradient-to-r from-[#E11D48] to-[#881337] hover:from-[#BE123C] hover:to-[#701A31] text-white font-bold rounded-xl shadow-md transition cursor-pointer"
        >
          Back to Campus Dining
        </button>
      </div>
    );
  }

  const currentStatus = liveOrder.status || order.status || 'CONFIRMED';
  const isCompleted = currentStatus === 'COMPLETED' || currentStatus === 'DELIVERED';
  const restaurantName = liveOrder.restaurant_name || order.restaurant_name || 'Campus Kitchen';
  const kitchenPhone = '8247075652';

  const orderDate = liveOrder.created_at || order.created_at
    ? new Date(liveOrder.created_at || order.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  let orderItems = [];
  try {
    const raw = liveOrder.items || order.items || liveOrder.order_items || order.order_items || [];
    orderItems = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
  } catch {
    orderItems = [];
  }
  const subtotal = Math.max(0, (Number(liveOrder.total_amount || order.total_amount) || 0) - 5);

  const handlePrint = () => {
    window.print();
  };

  const handleTestSound = () => {
    unlockStudentAudio();
    playStudentChime(currentStatus === 'DELIVERED' ? 'DELIVERED' : 'OUT_FOR_DELIVERY');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 animate-fade-in pb-28 md:pb-16">
      
      {/* Live Flash Alert Banner when Rider updates status */}
      {stageAlert && (
        <div className={`p-4 rounded-2xl border shadow-xl flex items-start gap-3 animate-slide-down ${
          stageAlert.type === 'DELIVERED'
            ? 'bg-emerald-500 text-white border-emerald-400'
            : 'bg-blue-600 text-white border-blue-400'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-xl">
            {stageAlert.type === 'DELIVERED' ? <CheckCheck size={22} /> : <CheckCircle2 size={22} className="animate-bounce" />}
          </div>
          <div className="flex-1">
            <h3 className="font-black text-base font-['Outfit']">{stageAlert.title}</h3>
            <p className="text-xs text-white/90 font-medium mt-0.5">{stageAlert.message}</p>
          </div>
          <button
            onClick={() => setStageAlert(null)}
            className="p-1 text-white/70 hover:text-white bg-transparent border-none cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Verified Order Confirmation Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 text-center border border-[#FFE4E6] shadow-sm space-y-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md border ${
          isCompleted
            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
        }`}>
          {isCompleted ? (
            <CheckCheck size={36} className="text-emerald-600" />
          ) : (
            <CheckCircle2 size={36} className="text-emerald-600" />
          )}
        </div>
        
        <div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
            isCompleted
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isCompleted ? '✅ Order Completed' : '👨‍🍳 Order Confirmed'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] font-['Outfit'] mt-2 tracking-tight">
            {isCompleted ? 'Enjoy Your Meal!' : 'Order Confirmed!'}
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            {isCompleted
              ? 'Your order has been completed and prepared by the kitchen.'
              : `Your order has been confirmed and is being handled by ${restaurantName}.`}
          </p>
        </div>

        {/* Live Order Progress Pipeline - Confirmed & Completed */}
        <div className="pt-3 border-t border-[#FFE4E6] grid grid-cols-2 gap-6 text-center text-xs max-w-xs mx-auto">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">✓</div>
            <span className="font-bold text-slate-800 mt-1.5 text-xs">Confirmed</span>
          </div>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
              isCompleted
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-200 text-slate-500'
            }`}>
              {isCompleted ? '✓' : '🍽️'}
            </div>
            <span className={`font-bold mt-1.5 text-xs ${
              isCompleted ? 'text-emerald-600' : 'text-slate-400'
            }`}>Completed</span>
          </div>
        </div>

        {/* Audio notification sound test button */}
        <div className="pt-2 flex items-center justify-center">
          <button
            onClick={handleTestSound}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer border border-slate-200"
          >
            <Volume2 size={13} className="text-[#E11D48]" />
            <span>Sound Alert: Active (Test Chime)</span>
          </button>
        </div>
      </div>

      {/* 2. Itemized Bill & Receipt Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#FFE4E6] shadow-sm space-y-5">
        
        {/* Receipt Meta */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#FFE4E6] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-[#0F172A] font-['Outfit']">Vit: Mute Bites</span>
              <span className="px-2 py-0.5 rounded bg-[#FFF1F2] text-[#9F1239] border border-[#FECDD3] text-[10px] font-black uppercase">
                Invoice
              </span>
            </div>
            <div className="text-xs text-[#0F172A] font-bold mt-1">
              {order.restaurant_name}
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-1">
              <Clock size={12} />
              <span>{orderDate}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Order ID
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-[#9F1239]">
              #{order.id}
            </div>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <ShieldCheck size={11} />
              <span>Status: {isCompleted ? 'Completed' : (currentStatus === 'CANCELLED' ? 'Cancelled' : 'Confirmed')}</span>
            </div>
          </div>
        </div>

        {/* Student and Delivery Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#FAF5F5] border border-[#FFE4E6] text-xs">
          <div>
            <div className="font-bold text-[#64748B] uppercase text-[10px] tracking-wider mb-1">
              Student Details
            </div>
            <div className="font-bold text-[#0F172A] text-sm">{order.student_name}</div>
            {order.student_email && (
              <div className="text-[#64748B] text-[11px] font-mono mt-0.5">{order.student_email}</div>
            )}
            {order.student_phone && (
              <div className="text-[#64748B] flex items-center gap-1 mt-1 font-mono">
                <Phone size={11} className="text-[#E11D48]" />
                <span>{order.student_phone}</span>
              </div>
            )}
          </div>

          <div>
            <div className="font-bold text-[#64748B] uppercase text-[10px] tracking-wider mb-1">
              Delivery Drop Location
            </div>
            <div className="flex items-start gap-1.5 text-[#0F172A] font-bold">
              <MapPin size={14} className="text-[#E11D48] shrink-0 mt-0.5" />
              <span>{order.delivery_location || 'Vit-ap Campus'}</span>
            </div>
            {order.instructions && (
              <div className="text-[#64748B] italic mt-1.5 text-[11px] bg-white p-2 rounded-lg border border-[#FFE4E6]">
                "{order.instructions}"
              </div>
            )}
          </div>
        </div>

        {/* Official Kitchen Contact & Delivery Info */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#FFF1F2] via-rose-50/50 to-white border border-[#FECDD3] shadow-sm text-xs space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E11D48] to-[#881337] text-white flex items-center justify-center shadow-md shadow-rose-900/20 shrink-0">
                <Store size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#0F172A] text-sm font-['Outfit']">
                    {restaurantName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    Official Kitchen
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium block">
                  Direct Kitchen Helpline for Order #{order.id}
                </span>
              </div>
            </div>

            <a
              href={`tel:${kitchenPhone}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E11D48] to-[#881337] hover:from-[#BE123C] hover:to-[#701A31] text-white font-bold text-xs shadow-md shadow-rose-900/20 transition-all cursor-pointer no-underline active:scale-95"
            >
              <Phone size={13} />
              <span>Call Restaurant (82470 75652)</span>
            </a>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-[#FFE4E6] text-slate-600 text-xs">
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-[#E11D48] shrink-0" />
              <span>Delivery Handover: <strong className="text-slate-900">{order.delivery_location || 'Vit-ap Campus'}</strong></span>
            </div>
            <span className="text-slate-500 text-[11px]">
              Direct Helpline: <strong className="text-slate-800 font-mono">+91 {kitchenPhone}</strong>
            </span>
          </div>
        </div>

        {/* Itemized Dishes List */}
        <div className="space-y-2">
          <div className="font-bold text-[#64748B] uppercase text-[10px] tracking-wider">
            Ordered Items
          </div>

          <div className="border border-[#FFE4E6] rounded-xl overflow-hidden divide-y divide-[#FFE4E6]">
            {orderItems.map((item, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between text-xs bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded bg-[#FFF1F2] text-[#9F1239] font-black text-[11px] flex items-center justify-center shrink-0 border border-[#FECDD3]">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-[#0F172A]">{item.name}</div>
                    <div className="text-[#64748B] text-[11px]">
                      ₹{item.price} × {item.quantity}
                    </div>
                  </div>
                </div>

                <div className="font-mono font-black text-xs sm:text-sm text-[#0F172A]">
                  ₹{item.price * item.quantity}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="p-3.5 rounded-xl bg-[#FAF5F5] border border-[#FFE4E6] space-y-1.5 text-xs">
          <div className="flex justify-between text-[#64748B]">
            <span>Items Subtotal</span>
            <span className="font-mono font-bold text-[#0F172A]">₹{subtotal}</span>
          </div>
          <div className="flex justify-between text-[#64748B]">
            <span>Campus Platform Fee</span>
            <span className="font-mono font-bold text-[#0F172A]">₹5</span>
          </div>
          <div className="flex justify-between text-[#64748B]">
            <span>Campus Delivery</span>
            <span className="font-bold text-emerald-700 uppercase text-[11px]">Free Campus Delivery</span>
          </div>

          <div className="pt-2 border-t border-[#FFE4E6] flex justify-between items-center text-base font-black text-[#0F172A]">
            <span>Total Amount</span>
            <span className="text-[#9F1239] font-mono font-black text-xl">
              ₹{order.total_amount}
            </span>
          </div>
        </div>

        {/* Print / Save Receipt Action */}
        <div className="pt-1 flex justify-end">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#FFE4E6] bg-white text-[#0F172A] text-xs font-bold hover:bg-[#FAF5F5] transition-colors cursor-pointer"
          >
            <Printer size={13} />
            <span>Print Receipt</span>
          </button>
        </div>

      </div>

      {/* 3. Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onGoHome}
          className="py-3 px-4 rounded-xl border border-[#FFE4E6] bg-white hover:bg-[#FAF5F5] text-[#0F172A] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Home size={15} />
          <span>Back to Home</span>
        </button>

        <button
          onClick={onViewHistory}
          className="py-3 px-4 rounded-xl btn-primary text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer border-none shadow-lg shadow-[#881337]/20 active:scale-98 transition-all"
        >
          <span>View My Orders</span>
          <ArrowRight size={15} />
        </button>
      </div>

    </div>
  );
}
