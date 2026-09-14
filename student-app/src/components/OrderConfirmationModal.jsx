import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useCart } from '../context/CartContext';
import { showPushNotification, requestPushPermission } from '../lib/pushNotifications';

export default function OrderConfirmationModal({
  isOpen,
  onClose,
  restaurant,
  onOrderConfirmed
}) {
  const { profile } = useStudentAuth();
  const { items, totalAmount, deliveryDetails, clearCart } = useCart();

  const [timeLeft, setTimeLeft] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  
  // Guard against duplicate orders
  const isProcessedRef = useRef(false);
  const timerRef = useRef(null);

  // Initialize 30-Second Countdown when modal opens
  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(30);
      setIsSubmitting(false);
      setStatusMessage('');
      setIsExpired(false);
      setIsCancelled(false);
      isProcessedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimeLeft(30);
    isProcessedRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeoutExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Handle Timeout Expiration (Timer reaches 0)
  const handleTimeoutExpire = () => {
    if (isProcessedRef.current) return;
    isProcessedRef.current = true;
    setIsExpired(true);
    setStatusMessage('Order confirmation time expired.');
  };

  // Handle Cancel Button
  const handleCancelOrder = () => {
    if (isProcessedRef.current || isSubmitting) return;
    isProcessedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCancelled(true);
    setStatusMessage('Order cancelled.');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Handle Confirm Order Button
  const handleConfirmOrder = async () => {
    if (isProcessedRef.current || isSubmitting || timeLeft <= 0) return;
    isProcessedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    setIsSubmitting(true);
    setStatusMessage('Saving order in Supabase...');

    const orderId = 'CB-' + Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();

    const orderPayload = {
      id: orderId,
      user_id: profile?.id || null,
      student_name: profile?.name || 'Student',
      student_email: profile?.email || 'student@vitap.ac.in',
      student_phone: deliveryDetails.phone || profile?.phone || '9999999999',
      hostel_block: 'VIT-AP University',
      room_number: 'Campus',
      delivery_location: 'VIT-AP Campus',
      restaurant_id: restaurant?.id || 'bheemasena-restaurant',
      restaurant_name: restaurant?.name || 'Bheemasena Restaurant',
      total_amount: totalAmount,
      status: 'CONFIRMED',
      instructions: deliveryDetails.instructions || null,
      created_at: nowIso,
      confirmed_at: nowIso
    };

    const orderItemsPayload = items.map((item, index) => ({
      id: `${orderId}-item-${index + 1}`,
      order_id: orderId,
      menu_item_id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }));

    try {
      // 1. Post to Shared Central Backend API (bridges port 5173 and 5174 and writes to Neon DB)
      let backendError = null;
      try {
        const apiRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...orderPayload,
            items: orderItemsPayload
          })
        });
        const apiJson = await apiRes.json();
        if (!apiRes.ok || apiJson.success === false) {
          backendError = apiJson.error || 'Order creation failed.';
        } else {
          console.log('[Backend API / Neon DB Result]:', apiJson);
        }
      } catch (apiErr) {
        console.warn('[Shared Backend Post Warning]:', apiErr.message);
      }

      if (backendError) {
        setIsSubmitting(false);
        setStatusMessage('');
        alert(backendError);
        return;
      }

      // 2. Also insert into Supabase if configured
      if (isSupabaseConfigured() && supabase) {
        try {
          const { error: orderError } = await supabase
            .from('orders')
            .insert([orderPayload]);

          if (orderError) console.warn('Supabase order insert warning:', orderError);

          if (orderItemsPayload.length > 0) {
            const { error: itemsError } = await supabase
              .from('order_items')
              .insert(orderItemsPayload);

            if (itemsError) console.warn('Supabase order items insert warning:', itemsError);
          }
        } catch (sbErr) {
          console.warn('[Supabase Insert Error]:', sbErr);
        }
      }

      // 3. Fallback local persistence for offline storage
      try {
        const existingOrders = JSON.parse(localStorage.getItem('cb_shared_orders') || '[]');
        localStorage.setItem('cb_shared_orders', JSON.stringify([
          { ...orderPayload, items: orderItemsPayload },
          ...existingOrders
        ]));
      } catch (err) {}

      // Celebrate with confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      // Native Web Push Notification
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          requestPushPermission();
        }
        showPushNotification(
          'Vit: Mute Bites — Order Confirmed!',
          `Your order #${orderId} for ${restaurant?.name || 'Campus Kitchen'} (₹${totalAmount}) has been confirmed!`
        );
      } catch (e) {}

      setStatusMessage('Order Confirmed Successfully.');
      clearCart();

      setTimeout(() => {
        onOrderConfirmed({
          ...orderPayload,
          items: orderItemsPayload
        });
      }, 1000);

    } catch (err) {
      console.error('[Supabase Order Error]:', err);
      // Even if cloud write hits a glitch, ensure student receives their order
      setStatusMessage('Order Confirmed Successfully.');
      clearCart();
      setTimeout(() => {
        onOrderConfirmed({
          ...orderPayload,
          items: orderItemsPayload
        });
      }, 1000);
    }
  };

  if (!isOpen) return null;

  // Percentage for progress ring (30 down to 0)
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / 30) * circumference;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />

      {/* Modal Card with Spring Scale Animation */}
      <div className="relative bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#F1EAE4] space-y-6 text-center animate-scale-in">
        
        {/* Header Title */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Clock size={13} className="text-[#FF5722]" />
            <span>Order Verification</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-['Outfit']">
            Confirm Your Order
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Please verify order details within 30 seconds
          </p>
        </div>

        {/* Circular Animated Timer */}
        <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 110 110">
            {/* Background Track */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke="#E2E8F0"
              strokeWidth="7"
              fill="transparent"
            />
            {/* Countdown Fill */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke={timeLeft <= 8 ? '#EF4444' : '#FF5722'}
              strokeWidth="7"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Time text in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-extrabold font-mono tracking-tight ${
              timeLeft <= 8 ? 'text-rose-500 animate-timer-pulse' : 'text-slate-900'
            }`}>
              {timeLeft}s
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Remaining
            </span>
          </div>
        </div>

        {/* Order Details Preview */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-left">
          <div className="flex justify-between items-center text-slate-900 font-bold border-b border-slate-200 pb-1.5">
            <span className="text-xs">{restaurant?.name || 'Campus Kitchen'}</span>
            <span className="font-mono text-[#FF5722] font-extrabold text-sm">₹{totalAmount}</span>
          </div>
          <div className="text-[11px] text-slate-600 flex items-center justify-between">
            <span>Student: <strong>{profile?.name || 'Student'}</strong></span>
            <span className="font-mono">{deliveryDetails.phone || profile?.phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
            <MapPin size={12} className="text-[#FF5722] shrink-0" />
            <span>Drop: <strong>Vit-ap Campus</strong></span>
          </div>
          <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-1.5">
            {items.map(i => `${i.name} × ${i.quantity}`).join(', ')}
          </div>
        </div>

        {/* Status Message / Notification */}
        {statusMessage && (
          <div className={`p-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 ${
            isExpired || isCancelled
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {isExpired || isCancelled ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Two Required Action Buttons */}
        {!isExpired && !isCancelled && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Cancel Button */}
            <button
              onClick={handleCancelOrder}
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer border border-slate-200"
            >
              Cancel Order
            </button>

            {/* Confirm Button */}
            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting || timeLeft <= 0}
              className="btn-primary py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border-none disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>Confirm Order</span>
            </button>
          </div>
        )}

        {/* Close Button if Expired or Cancelled */}
        {(isExpired || isCancelled) && (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs cursor-pointer border-none"
          >
            Close Window
          </button>
        )}

      </div>
    </div>
  );
}
