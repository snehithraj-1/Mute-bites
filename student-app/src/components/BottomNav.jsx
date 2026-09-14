import React from 'react';
import { Home, ShoppingBag, Clock, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStudentAuth } from '../context/StudentAuthContext';

export default function BottomNav({ currentView, onNavigate }) {
  const { totalItemsCount, setIsCartOpen, isCartOpen } = useCart();
  const { profile } = useStudentAuth();

  const isCartActive = isCartOpen;
  const isHomeActive = !isCartOpen && (currentView === 'restaurants' || currentView === 'menu');
  const isOrdersActive = !isCartOpen && (currentView === 'history' || currentView === 'success');
  const isProfileActive = !isCartOpen && (currentView === 'profile');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#FFE4E6] shadow-sm transition-all pb-safe">
      <div className="max-w-md mx-auto px-4 h-15 flex items-center justify-around relative">
        
        {/* 1. Home Tab */}
        <button
          onClick={() => {
            setIsCartOpen(false);
            onNavigate('restaurants');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer border-none bg-transparent group relative active:scale-95 ${
            isHomeActive ? 'text-[#9F1239]' : 'text-[#71717A] hover:text-[#1C1917]'
          }`}
          title="Browse Restaurants & Menus"
        >
          {isHomeActive && (
            <span className="absolute top-0 w-8 h-0.5 rounded-full bg-gradient-to-r from-[#E11D48] to-[#9F1239]" />
          )}
          <Home
            size={20}
            className={`transition-transform duration-200 ${
              isHomeActive ? 'stroke-[2.5]' : ''
            }`}
          />
          <span className={`text-[10px] mt-1 font-bold ${isHomeActive ? 'font-extrabold text-[#9F1239]' : ''}`}>
            Home
          </span>
        </button>

        {/* 2. Cart Tab */}
        <button
          onClick={() => setIsCartOpen((prev) => !prev)}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer border-none bg-transparent group relative active:scale-95 ${
            isCartActive ? 'text-[#9F1239]' : 'text-[#71717A] hover:text-[#1C1917]'
          }`}
          title="Toggle Food Cart"
        >
          {isCartActive && (
            <span className="absolute top-0 w-8 h-0.5 rounded-full bg-gradient-to-r from-[#E11D48] to-[#9F1239]" />
          )}
          <div className="relative">
            <ShoppingBag
              size={20}
              className={`transition-transform duration-200 ${
                isCartActive ? 'stroke-[2.5]' : ''
              }`}
            />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-gradient-to-r from-[#E11D48] to-[#9F1239] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {totalItemsCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] mt-1 font-bold ${isCartActive ? 'font-extrabold text-[#9F1239]' : ''}`}>
            Cart
          </span>
        </button>

        {/* 3. My Orders Tab */}
        <button
          onClick={() => {
            setIsCartOpen(false);
            onNavigate('history');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer border-none bg-transparent group relative active:scale-95 ${
            isOrdersActive ? 'text-[#9F1239]' : 'text-[#71717A] hover:text-[#1C1917]'
          }`}
          title="View Past & Live Orders"
        >
          {isOrdersActive && (
            <span className="absolute -top-2.5 w-8 h-1 rounded-full bg-gradient-to-r from-[#E11D48] to-[#9F1239] shadow-sm shadow-[#E11D48]/50 animate-scale-in" />
          )}
          <Clock
            size={22}
            className={`transition-transform duration-300 ${
              isOrdersActive ? 'scale-110 stroke-[2.5]' : 'group-hover:scale-105'
            }`}
          />
          <span className={`text-[11px] mt-1 font-bold ${isOrdersActive ? 'font-black text-[#9F1239]' : ''}`}>
            My Orders
          </span>
        </button>

        {/* 4. Profile Tab (Swiggy style) */}
        <button
          onClick={() => {
            setIsCartOpen(false);
            onNavigate('profile');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer border-none bg-transparent group relative active:scale-95 ${
            isProfileActive ? 'text-[#9F1239]' : 'text-[#71717A] hover:text-[#1C1917]'
          }`}
          title="Student Profile & Settings"
        >
          {isProfileActive && (
            <span className="absolute -top-2.5 w-8 h-1 rounded-full bg-gradient-to-r from-[#E11D48] to-[#9F1239] shadow-sm shadow-[#E11D48]/50 animate-scale-in" />
          )}
          <div className="relative">
            <User
              size={22}
              className={`transition-transform duration-300 ${
                isProfileActive ? 'scale-110 stroke-[2.5]' : 'group-hover:scale-105'
              }`}
            />
            {profile?.phone && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
            )}
          </div>
          <span className={`text-[11px] mt-1 font-bold ${isProfileActive ? 'font-black text-[#9F1239]' : ''}`}>
            Profile
          </span>
        </button>

      </div>
    </nav>
  );
}
