import React from 'react';
import { ShoppingBag, Clock, User, LogOut, MapPin } from 'lucide-react';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar({ currentView, onNavigate }) {
  const { profile, logout } = useStudentAuth();
  const { totalItemsCount, totalAmount, setIsCartOpen } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#FFE4E6] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Brand & Campus Delivery Point */}
        <div 
          onClick={() => onNavigate('restaurants')}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <img 
            src="/mutebites-logo.png" 
            alt="Mutebites Logo" 
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover shadow-md shadow-rose-900/20 group-hover:scale-105 transition-transform border border-[#FFE4E6]"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black text-[#1C1917] tracking-tight font-['Outfit'] group-hover:text-[#9F1239] transition-colors">
                Vit: Mute Bites
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#71717A] font-medium">
              <MapPin size={12} className="text-[#E11D48] shrink-0" />
              <span>Vit-ap Campus</span>
            </div>
          </div>
        </div>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => onNavigate('restaurants')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              currentView === 'restaurants' || currentView === 'menu'
                ? 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3] shadow-xs'
                : 'bg-transparent text-[#71717A] hover:text-[#881337] hover:bg-[#FFF1F2]/60 border-transparent'
            }`}
          >
            Kitchens
          </button>

          <button
            onClick={() => onNavigate('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              currentView === 'history' || currentView === 'success'
                ? 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3] shadow-xs'
                : 'bg-transparent text-[#71717A] hover:text-[#881337] hover:bg-[#FFF1F2]/60 border-transparent'
            }`}
          >
            <Clock size={14} />
            <span>Orders</span>
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-transparent bg-transparent text-[#71717A] hover:text-[#881337] hover:bg-[#FFF1F2]/60 relative"
          >
            <ShoppingBag size={14} />
            <span>Cart</span>
            {totalItemsCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-[#E11D48] to-[#9F1239] text-white text-[10px] font-bold flex items-center justify-center shadow-xs shadow-rose-600/30">
                {totalItemsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Actions: Student Profile & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3">
          {profile && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2 text-right bg-transparent border-none p-0 cursor-pointer group"
                title="View Student Profile"
              >
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-[#1C1917] group-hover:text-[#9F1239] transition-colors leading-tight">
                    {profile.name || 'Student'}
                  </div>
                  <div className="text-[10px] text-[#71717A]">
                    {profile.phone ? `+91 ${profile.phone}` : profile.email}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-lg bg-[#FFF1F2] text-[#9F1239] font-bold text-xs flex items-center justify-center border border-[#FECDD3] group-hover:border-[#E11D48] transition-colors">
                  {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'ST'}
                </div>
              </button>

              <button
                onClick={logout}
                title="Sign Out"
                className="w-8 h-8 rounded-lg bg-[#FAF5F5] hover:bg-rose-50 text-[#71717A] hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer border border-[#FFE4E6]"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
