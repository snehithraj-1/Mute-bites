import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, ShoppingBag, ArrowLeft, CheckCircle2, XCircle, AlertCircle, MapPin, Phone } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStudentAuth } from '../context/StudentAuthContext';

export default function OrderHistoryPage({ onBackToRestaurants, onTrackOrder }) {
  const { profile } = useStudentAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOrders = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // 1. Try to fetch from Shared Central API / Vercel Serverless API
      const email = (profile?.email || '').trim();
      const phone = (profile?.phone || '').trim();
      const userId = (profile?.id || '').trim();
      const identifier = email || phone || userId || '';

      let res = null;
      if (identifier) {
        res = await fetch(`/api/orders/student/${encodeURIComponent(identifier)}?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
      }
      if (!res || !res.ok) {
        res = await fetch(`/api/orders?studentEmail=${encodeURIComponent(email || identifier)}&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
      }
      if (res && res.ok) {
        const json = await res.json();
        const ordersList = Array.isArray(json) ? json : (json.orders || []);
        if (Array.isArray(ordersList)) {
          setOrders(ordersList);
          // Sync localStorage so deleted orders NEVER resurrect!
          try {
            localStorage.setItem('cb_shared_orders', JSON.stringify(ordersList));
          } catch {}
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      }
    } catch (apiErr) {
      // Continue to Supabase / local only on network failure
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*)
          `)
          .eq('user_id', profile?.id)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setOrders(data);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      } catch (err) {
        console.warn('[Supabase Orders History]:', err.message);
      }
    }

    // Fallback local persistence
    try {
      const stored = JSON.parse(localStorage.getItem('cb_shared_orders') || '[]');
      const filtered = stored.filter(
        (o) => !o.user_id || o.user_id === profile?.id || o.student_email === profile?.email
      );
      setOrders(filtered);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (profile?.id || profile?.email) {
      fetchOrders();

      // Poll shared backend every 2.5s for live status updates from Admin
      const interval = setInterval(() => {
        fetchOrders(true);
      }, 2500);

      // Realtime updates for live status changes on student's orders via Supabase
      if (isSupabaseConfigured() && supabase) {
        const channel = supabase
          .channel(`student-orders-${profile.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `user_id=eq.${profile.id}`
            },
            () => {
              fetchOrders(true);
            }
          )
          .subscribe();

        return () => {
          clearInterval(interval);
          supabase.removeChannel(channel);
        };
      }

      return () => clearInterval(interval);
    }
  }, [profile?.id, profile?.email]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
        return { label: 'Completed', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold' };
      case 'CANCELLED':
        return { label: 'Cancelled', bg: 'bg-rose-50 text-rose-800 border-rose-200 font-bold' };
      case 'CONFIRMED':
      default:
        return { label: 'Confirmed', bg: 'bg-amber-50 text-amber-800 border-amber-200 font-bold' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5 animate-fade-in pb-24 md:pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={onBackToRestaurants}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer border-none bg-transparent p-0 mb-1"
          >
            <ArrowLeft size={15} />
            <span>Back to Restaurants</span>
          </button>
          <h2 className="text-xl font-extrabold text-slate-900 font-['Outfit']">
            My Order History
          </h2>
          <p className="text-xs text-slate-500">
            Account: {profile?.email}
          </p>
        </div>

        <button
          onClick={() => fetchOrders(true)}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Refresh Orders"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#FF5722]' : ''} />
        </button>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="py-16 text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#FF5722] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2.5">
          <h3 className="text-base font-bold text-slate-900 font-['Outfit']">No orders placed yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Browse our campus kitchens to place an order for delivery at Vit-ap Campus.
          </p>
          <div className="pt-2">
            <button
              onClick={onBackToRestaurants}
              className="btn-primary py-2 px-5 rounded-lg text-xs font-bold cursor-pointer border-none"
            >
              Browse Campus Kitchens
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const badge = getStatusBadge(order.status);
            let dateFormatted = 'Just now';
            try {
              const d = new Date(order.created_at);
              if (!isNaN(d.getTime())) {
                dateFormatted = d.toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }
            } catch {}

            let orderItems = [];
            const rawItems = order.order_items || order.items || [];
            if (typeof rawItems === 'string') {
              try { orderItems = JSON.parse(rawItems); } catch { orderItems = []; }
            } else if (Array.isArray(rawItems)) {
              orderItems = rawItems;
            }

            return (
              <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        #{order.id}
                      </span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="font-bold text-xs text-slate-800">
                        {order.restaurant_name || 'Campus Kitchen'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {dateFormatted}
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${badge.bg}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Items and Total */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="sm:col-span-2 space-y-1">
                    <div className="text-slate-800 font-medium leading-relaxed">
                      {orderItems.length > 0
                        ? orderItems.map((item, idx) => (
                            <span key={idx}>
                              {item.name || item.item_name || 'Food Item'} <span className="font-mono font-bold text-[#FF5722]">×{item.quantity || item.qty || 1}</span>
                              {idx < orderItems.length - 1 ? ', ' : ''}
                            </span>
                          ))
                        : 'Food order'}
                    </div>
                    <div className="pt-0.5">
                      <a href="tel:9989955833" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-semibold mt-1 no-underline hover:bg-orange-100">
                        <Phone size={11} className="text-[#FF5722]" />
                        <span>Kitchen Helpline: <strong>+91 9989955833</strong></span>
                      </a>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-sm font-bold font-mono text-slate-900">
                      ₹{order.total_amount}
                    </div>
                  </div>
                </div>

                {/* Drop Destination & Track Button */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-[#FF5722]" />
                    <span>Drop: {order.delivery_location || 'Vit-ap Campus'}</span>
                  </div>

                  <button
                    onClick={() => onTrackOrder && onTrackOrder(order)}
                    className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer border border-slate-200"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
