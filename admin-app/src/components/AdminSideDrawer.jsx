import React, { useEffect } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  UtensilsCrossed,
  Users,
  RefreshCw,
  LogOut,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Store
} from 'lucide-react';

export default function AdminSideDrawer({
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
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity cursor-pointer" />

      <div className="relative w-full max-w-sm sm:max-w-md bg-[#0F172A] border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col h-full z-10 animate-drawer-right overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#111C34]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg shadow-lg border border-blue-400/30">
              🛡️
            </div>
            <div>
              <h3 className="text-base font-black text-white font-['Outfit'] tracking-tight">
                Control Hub
              </h3>
              <p className="text-[11px] text-slate-400">Vit: Mute Bites Dispatch Console</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Admin Identity Card */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Logged In Administrator
              </span>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Neon Live</span>
              </div>
            </div>
            <h4 className="text-sm font-extrabold text-white">
              {profile?.name || 'Administrator'}
            </h4>
            <p className="text-[11px] text-slate-400 font-mono truncate">
              {profile?.email || profile?.username || 'admin@collegebites.com'}
            </p>
            <span className="inline-block px-2 py-0.5 mt-1 rounded-md bg-orange-500/20 text-[#FF5722] text-[10px] font-extrabold uppercase border border-orange-500/30">
              {profile?.role === 'super_admin' ? 'Super Admin' : 'Kitchen Staff'}
            </span>
          </div>

          {/* Navigation Items */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
              Operations & Database
            </span>

            {/* Menu & Stock */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMenuManager();
              }}
              className="w-full p-3 rounded-2xl bg-slate-900 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-base border border-amber-500/30">
                  🍽️
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 block">
                    Menu & Inventory
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Dishes, prices & sold out toggles
                  </p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-500 group-hover:text-amber-400" />
            </button>

            {/* Students Directory */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenStudentsModal();
              }}
              className="w-full p-3 rounded-2xl bg-slate-900 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/40 text-left transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-base border border-blue-500/30">
                  👥
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 block">
                    Students Database
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Registered accounts & mobile numbers
                  </p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-500 group-hover:text-blue-400" />
            </button>

            {/* Live Student Portal */}
            <a
              href={typeof window !== 'undefined' && window.location.hostname === 'clg-bites-srm.vercel.app' ? '/' : 'https://clg-bites-srm.vercel.app'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-3 rounded-2xl bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-base border border-emerald-500/30">
                  🎓
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 block">
                    Student Portal
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Live customer dining interface
                  </p>
                </div>
              </div>
              <ExternalLink size={15} className="text-slate-500 group-hover:text-emerald-400" />
            </a>
          </div>

          {/* Preferences */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
              Preferences & Sync
            </span>

            {/* Sound Toggle */}
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  soundEnabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white block">Order Alert Sound</span>
                  <p className="text-[11px] text-slate-400">Chime on incoming orders</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleSound}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Manual Sync Button */}
            <button
              type="button"
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="w-full p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
                  <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-orange-400' : ''} />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white block">Sync Live Data</span>
                  <p className="text-[11px] text-slate-400">Pull latest orders & status</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {isRefreshing ? 'Syncing...' : 'Refresh'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer: Sign Out */}
        <div className="p-5 border-t border-slate-800 bg-[#111C34] space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 text-xs font-bold transition-all cursor-pointer border border-rose-800 flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            <span>Sign Out of Admin Control</span>
          </button>
          <p className="text-center text-[10px] text-slate-500 font-mono">
            Vit: Mute Bites v2.0 • VIT-AP Campus Dispatch
          </p>
        </div>
      </div>
    </div>
  );
}
