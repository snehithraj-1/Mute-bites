import React, { useState, useEffect } from 'react';
import { Store, Clock, Phone, MapPin, ArrowRight, AlertCircle, CheckCircle2, XCircle, Search, Utensils } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_RESTAURANTS } from '../lib/campusSeedData';
import { useStudentAuth } from '../context/StudentAuthContext';

export default function RestaurantsPage({ onSelectRestaurant, orderingEnabled }) {
  const { profile } = useStudentAuth();
  const [restaurants, setRestaurants] = useState(DEFAULT_RESTAURANTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch restaurants from backend API
  const loadRestaurants = async () => {
    try {
      const res = await fetch('/api/restaurants');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.restaurants) && json.restaurants.length > 0) {
          setRestaurants(json.restaurants);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {}

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          setRestaurants(data);
        }
      } catch (err) {
        console.warn('[Supabase Restaurants Fetch]:', err.message);
      }
    } else {
      try {
        const localSettings = JSON.parse(localStorage.getItem('cb_shared_restaurants') || 'null');
        if (localSettings && Array.isArray(localSettings)) {
          setRestaurants(localSettings);
        } else {
          setRestaurants(DEFAULT_RESTAURANTS);
        }
      } catch {
        setRestaurants(DEFAULT_RESTAURANTS);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRestaurants();
    const interval = setInterval(loadRestaurants, 3000);

    if (isSupabaseConfigured() && supabase) {
      const channel = supabase
        .channel('public:restaurants')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => {
          loadRestaurants();
        })
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }

    return () => clearInterval(interval);
  }, []);

  const filteredRestaurants = restaurants.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.cuisine && r.cuisine.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5 animate-fade-in pb-24 md:pb-12">
      
      {/* 1. Header & Location Bar (Luxury Food App Style) */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-[#FFE4E6] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#71717A] font-medium">
              Welcome, <strong className="text-[#1C1917] font-extrabold">{profile?.name || 'Student'}</strong>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#1C1917] font-['Outfit'] tracking-tight mt-0.5">
              Campus Food Ordering
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-700 mt-1">
              <MapPin size={14} className="text-[#E11D48] shrink-0" />
              <span>Delivering directly to <strong className="text-[#9F1239]">Vit-ap Campus</strong></span>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400" />
            <input
              type="text"
              placeholder="Search kitchens & food..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF5F5] border border-[#FFE4E6] text-xs text-[#1C1917] placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:bg-white focus:ring-3 focus:ring-[#E11D48]/15 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 2. Platform Ordering Paused Alert */}
      {!orderingEnabled && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <div>
            <strong>Campus ordering is temporarily paused.</strong> Restaurant kitchens will reopen shortly.
          </div>
        </div>
      )}

      {/* 3. Section Title */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Available Restaurants ({filteredRestaurants.length})
          </h3>
          <p className="text-xs text-slate-500">
            Fresh food prepared and delivered directly to Vit-ap Campus
          </p>
        </div>
      </div>

      {/* 4. Restaurant Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading ? (
          [1, 2].map((n) => (
            <div key={n} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="h-44 w-full skeleton-shimmer" />
              <div className="p-4 space-y-3">
                <div className="w-3/4 h-4 skeleton-shimmer" />
                <div className="w-full h-8 skeleton-shimmer" />
                <div className="w-full h-10 skeleton-shimmer rounded-lg" />
              </div>
            </div>
          ))
        ) : filteredRestaurants.length === 0 ? (
          <div className="col-span-full py-10 text-center bg-white rounded-xl border border-slate-200 p-6 space-y-2">
            <Utensils size={24} className="mx-auto text-slate-400" />
            <h4 className="text-sm font-bold text-slate-800">No restaurants found</h4>
            <p className="text-xs text-slate-500">Try clearing your search query.</p>
          </div>
        ) : (
          filteredRestaurants.map((restaurant) => {
            const isOpen = Boolean(orderingEnabled) && restaurant.is_open !== false;

            return (
              <div
                key={restaurant.id}
                className={`bg-white rounded-xl border transition-all overflow-hidden flex flex-col justify-between ${
                  isOpen
                    ? 'border-slate-200 hover:border-slate-400 shadow-xs'
                    : 'border-slate-200 opacity-70 bg-slate-50'
                }`}
              >
                {/* Restaurant Image with Status Badge */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={restaurant.image_url || 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80'}
                    alt={restaurant.name}
                    loading="lazy"
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      !isOpen ? 'grayscale' : 'hover:scale-102'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Top Bar Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/95 text-slate-800 shadow-xs">
                      {restaurant.cuisine || 'Fast Food & Biryani'}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold tracking-wide uppercase flex items-center gap-1 shadow-xs ${
                        isOpen
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {isOpen ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      <span>{isOpen ? 'OPEN' : 'CLOSED'}</span>
                    </span>
                  </div>

                  {/* Bottom Text Over Image */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h4 className="text-lg font-bold font-['Outfit'] leading-snug drop-shadow-sm">
                      {restaurant.name}
                    </h4>
                  </div>
                </div>

                {/* Restaurant Information & Action */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-white">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-[#71717A]">
                      <MapPin size={12} className="text-[#E11D48] shrink-0" />
                      <span className="truncate">{restaurant.location || 'Beside VIT-AP Campus'}</span>
                    </div>

                    {restaurant.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-[#71717A]">
                        <Phone size={12} className="text-[#E11D48] shrink-0" />
                        <span className="font-mono font-medium">{restaurant.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-[#71717A]">
                      <Clock size={12} className="shrink-0 text-slate-400" />
                      <span>Prep time: {restaurant.prep_time || '15-20 mins'}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Free Delivery</span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-1 font-normal">
                      {restaurant.description}
                    </p>
                  </div>

                  {/* Closed Banner if restaurant closed */}
                  {!isOpen && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium flex items-center gap-1.5">
                      <AlertCircle size={13} className="shrink-0 text-rose-600" />
                      <span>Currently CLOSED • Menu browsing only</span>
                    </div>
                  )}

                  {/* Action CTA */}
                  <div className="pt-1">
                    <button
                      onClick={() => onSelectRestaurant(restaurant)}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all border-none ${
                        isOpen
                          ? 'bg-gradient-to-r from-[#E11D48] to-[#881337] hover:from-[#F43F5E] hover:to-[#9F1239] text-white cursor-pointer shadow-md shadow-rose-900/20 active:scale-98'
                          : 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer shadow-xs active:scale-98'
                      }`}
                    >
                      <span>{isOpen ? 'View Menu & Order' : 'View Menu (Orders Closed)'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
