import React, { useState, useEffect } from 'react';
import { StudentAuthProvider, useStudentAuth } from './context/StudentAuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import Navbar from './components/Navbar';
import SystemAlertBanner from './components/SystemAlertBanner';
import CartDrawer from './components/CartDrawer';
import OrderConfirmationModal from './components/OrderConfirmationModal';
import StudentLoginPage from './pages/StudentLoginPage';
import RestaurantsPage from './pages/RestaurantsPage';
import MenuPage from './pages/MenuPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import StudentProfilePage from './pages/StudentProfilePage';
import StudentNotificationToast from './components/StudentNotificationToast';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';

function StudentAppInner() {
  const { isAuthenticated, loading } = useStudentAuth();
  
  // Navigation state: 'restaurants' | 'menu' | 'success' | 'history' | 'profile' | 'rider'
  const [currentView, setCurrentView] = useState('restaurants');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  // Overall Ordering System Status from Supabase
  const [orderingEnabled, setOrderingEnabled] = useState(true);



  // 1. Fetch and listen to System Settings (Neon PostgreSQL via Backend API)
  useEffect(() => {
    async function loadSystemSettings() {
      try {
        const res = await fetch('/api/settings/ordering');
        if (res.ok) {
          const json = await res.json();
          if (typeof json.ordering_enabled === 'boolean') {
            setOrderingEnabled(json.ordering_enabled);
            return;
          }
        }
      } catch (e) {}

      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase
            .from('system_settings')
            .select('ordering_enabled')
            .eq('id', 'global')
            .single();

          if (error) throw error;
          if (data) {
            setOrderingEnabled(data.ordering_enabled !== false);
          }
        } catch (err) {
          console.warn('[Supabase Settings]:', err.message);
        }
      } else {
        try {
          const localSetting = localStorage.getItem('cb_shared_ordering_enabled');
          if (localSetting !== null) {
            setOrderingEnabled(localSetting === 'true');
          }
        } catch {}
      }
    }

    loadSystemSettings();

    // High-frequency 2.5s poll to sync Admin's Master Toggle instantly
    const pollInterval = setInterval(loadSystemSettings, 2500);

    // Realtime listener for Master Ordering Switch
    if (isSupabaseConfigured() && supabase) {
      const channel = supabase
        .channel('public:system_settings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, (payload) => {
          if (payload.new && typeof payload.new.ordering_enabled === 'boolean') {
            setOrderingEnabled(payload.new.ordering_enabled);
          }
        })
        .subscribe();

      return () => {
        clearInterval(pollInterval);
        supabase.removeChannel(channel);
      };
    }

    return () => clearInterval(pollInterval);
  }, []);

  // Handlers
  const handleSelectRestaurant = (restaurant) => {
    if (!orderingEnabled || restaurant.is_open === false) return;
    setSelectedRestaurant(restaurant);
    setCurrentView('menu');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If ordering gets paused while student is on the menu page, return them to restaurants page
  useEffect(() => {
    if (!orderingEnabled && currentView === 'menu') {
      setCurrentView('restaurants');
    }
  }, [orderingEnabled, currentView]);

  const handleOrderConfirmed = (order) => {
    setIsConfirmationOpen(false);
    setConfirmedOrder(order);
    setCurrentView('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF5F5] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#E11D48] border-t-transparent animate-spin" />
        <p className="text-xs font-bold text-[#64748B]">Loading Student Portal...</p>
      </div>
    );
  }

  // Not authenticated -> Show Email OTP Student Login
  if (!isAuthenticated) {
    return <StudentLoginPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* System Warning Banner if Admin Turned Ordering OFF */}
      <SystemAlertBanner orderingEnabled={orderingEnabled} />

      {/* Main Pages */}
      <main className="flex-1 pb-24 md:pb-12">
        {currentView === 'restaurants' && (
          <RestaurantsPage
            onSelectRestaurant={handleSelectRestaurant}
            orderingEnabled={orderingEnabled}
          />
        )}

        {currentView === 'menu' && selectedRestaurant && (
          <MenuPage
            restaurant={selectedRestaurant}
            onBack={() => {
              setCurrentView('restaurants');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            orderingEnabled={orderingEnabled}
          />
        )}

        {currentView === 'success' && confirmedOrder && (
          <OrderSuccessPage
            order={confirmedOrder}
            onGoHome={() => {
              setCurrentView('restaurants');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewHistory={() => {
              setCurrentView('history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'history' && (
          <OrderHistoryPage
            onBackToRestaurants={() => {
              setCurrentView('restaurants');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onTrackOrder={(order) => {
              setConfirmedOrder(order);
              setCurrentView('success');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'profile' && (
          <StudentProfilePage
            onBackToHome={() => {
              setCurrentView('restaurants');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewOrders={() => {
              setCurrentView('history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        orderingEnabled={orderingEnabled}
        isRestaurantOpen={selectedRestaurant ? selectedRestaurant.is_open !== false : true}
        onProceedToConfirmation={() => setIsConfirmationOpen(true)}
      />

      {/* 30-Second Confirmation Modal */}
      <OrderConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        restaurant={selectedRestaurant}
        onOrderConfirmed={handleOrderConfirmed}
      />

      {/* Floating Real-Time Order Status Notifications (Cooking, Ready, Out for delivery to Vit-ap Campus) */}
      <StudentNotificationToast
        activeOrderId={confirmedOrder?.id}
        onTrackOrder={(order) => {
          setConfirmedOrder(order);
          setCurrentView('success');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Swiggy-Style Bottom Navigation Bar (Home, Cart, My Orders, Profile) */}
      <BottomNav
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Modern Student Footer */}
      <footer className="bg-white border-t border-[#FFE4E6] pt-8 pb-24 md:pb-8 text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-[#0F172A] font-['Outfit']">Vit: Mute Bites</span>
            <span>•</span>
            <span>Student Food Ordering Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span>VIT-AP University Campus, Amaravati</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StudentAuthProvider>
        <CartProvider>
          <StudentAppInner />
        </CartProvider>
      </StudentAuthProvider>
    </ErrorBoundary>
  );
}
