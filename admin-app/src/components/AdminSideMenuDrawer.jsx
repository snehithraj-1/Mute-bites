import React, { useEffect } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  UtensilsCrossed,
  Users,
  RefreshCw,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function AdminSideMenuDrawer({
  isOpen,
  onClose,
  profile,
  soundEnabled,
  onToggleSound,
  onOpenMenuManager,
  onOpenStudentsModal,
  onRefreshData,
  isRefreshing,
  onLogout
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity cursor-pointer"
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#0F172A] border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col h-full z-10 animate-drawer-right overflow-hidden">
        
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-[#111C34]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#F4511E] flex items-center justify-center text-white text-xl shadow-lg shadow-orange-500/20 border border-orange-400/30">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white font-['Outfit'] tracking-tight">
                  Control Center
                </span>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-extrabold uppercase border border-orange-500/30 font-['Outfit']">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-['Outfit']">
                Vit: Mute Bites Operations Hub
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
            title="Close Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Admin Identity Card */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-['Outfit']">
                Logged In Administrator
              </span>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Neon Live</span>
              </div>
            </div>

            <div className="pt-0.5">
              <h4 className="text-sm font-extrabold text-white font-['Outfit']">
                {profile?.name || 'Administrator'}
              </h4>
              <p className="text-xs text-slate-400 font-mono truncate">
                {profile?.email || 'admin@collegebites.internal'}
              </p>
            </div>
          </div>

          {/* Core Management Navigation */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
              Operations & Database
            </span>

            {/* 2. Menu & Inventory */}
            <button
              onClick={() => {
                onClose();
                onOpenMenuManager();
              }}
              className="w-full p-3.5 rounded-2xl bg-slate-900/90 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-lg border border-amber-500/30 group-hover:scale-105 transition-transform">
                  🍽️
                </div>
                <div>
                  <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors block">
                    Menu & Inventory
                  </span>
                  <p className="text-xs text-slate-400">
                    Dishes, prices & sold out toggles
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </button>



            {/* 4. Students Database (Super Admin only) */}
            {profile?.role !== 'restaurant_admin' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStudentsModal();
                }}
                className="w-full p-3.5 rounded-2xl bg-slate-900/90 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/40 text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-lg border border-blue-500/30 group-hover:scale-105 transition-transform">
                    👥
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors block">
                      Students Database
                    </span>
                    <p className="text-xs text-slate-400">
                      Registered accounts & mobile numbers
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            )}
          </div>

          {/* Quick Settings & Controls */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
              Preferences & Sync
            </span>

            {/* Audio Alert Chime Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border transition-colors ${
                  soundEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">
                    Order Audio Chime
                  </span>
                  <p className="text-xs text-slate-400">
                    {soundEnabled ? 'Harmonic alert on new order' : 'Audio alerts are muted'}
                  </p>
                </div>
              </div>

              <button
                onClick={onToggleSound}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                  soundEnabled
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Manual Sync All Orders */}
            <button
              onClick={() => {
                onRefreshData();
              }}
              className="w-full p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700 group-hover:text-blue-400 transition-colors">
                  <RefreshCw size={17} className={isRefreshing ? 'animate-spin text-blue-400' : ''} />
                </div>
                <div>
                  <span className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors block">
                    Sync Live Data
                  </span>
                  <p className="text-xs text-slate-400">
                    Refresh Neon DB orders & restaurants
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                {isRefreshing ? 'Syncing...' : 'Refresh'}
              </span>
            </button>
          </div>

        </div>

        {/* Drawer Sticky Footer: Sign Out */}
        <div className="p-5 sm:p-6 border-t border-slate-800 bg-[#111C34] space-y-2">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 text-xs sm:text-sm font-bold transition-all cursor-pointer border border-rose-800/60 flex items-center justify-center gap-2 shadow-sm"
          >
            <LogOut size={16} />
            <span>Sign Out of Admin Control</span>
          </button>

          <p className="text-center text-[10px] text-slate-500 font-mono">
            Vit: Mute Bites v1.2 • Vit-ap Campus Dispatch
          </p>
        </div>

      </div>
    </div>
  );
}
