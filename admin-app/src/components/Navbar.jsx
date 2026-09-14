import React from 'react';
import { Volume2, VolumeX, RefreshCw, Menu, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';

export default function Navbar({
  profile,
  soundEnabled,
  onToggleSound,
  onRefresh,
  isRefreshing,
  onOpenDrawer
}) {
  return (
    <header className="sticky top-0 z-30 bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF5722] to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/20 border border-orange-400/30 shrink-0">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black font-['Outfit'] text-white tracking-tight">
                Collage Bites
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-orange-500/20 text-[#FF5722] text-[10px] font-black uppercase tracking-wider border border-orange-500/30">
                {profile?.role === 'super_admin' ? 'Super Admin' : 'Kitchen Staff'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Neon Live Sync Active</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute incoming order alerts' : 'Enable incoming order sound alert'}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden md:inline">{soundEnabled ? 'Alerts ON' : 'Muted'}</span>
          </button>

          {/* Sync Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh orders and status now"
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-orange-400' : ''} />
            <span className="hidden md:inline">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* View Live Student Portal */}
          <a
            href={typeof window !== 'undefined' && (window.location.hostname === 'mutebites-std.vercel.app' || window.location.hostname.includes('mutebites-std')) ? '/' : 'https://mutebites-std.vercel.app'}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Live Student Portal"
            className="hidden sm:flex px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold items-center gap-1.5 transition-all"
          >
            <span>Student App</span>
            <ExternalLink size={14} className="text-slate-400" />
          </a>

          {/* Side Drawer Toggle */}
          <button
            type="button"
            onClick={onOpenDrawer}
            className="p-2.5 rounded-xl bg-[#FF5722] hover:bg-[#F4511E] text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer border-none flex items-center justify-center"
            title="Open Operations Drawer"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
