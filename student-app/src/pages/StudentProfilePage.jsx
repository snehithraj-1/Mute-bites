import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Edit3,
  Save,
  LogOut,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  X,
  Database,
  Smartphone,
  Hash
} from 'lucide-react';
import { useStudentAuth } from '../context/StudentAuthContext';

export default function StudentProfilePage({ onBackToHome, onViewOrders }) {
  const { profile, updateProfile, logout } = useStudentAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  const nameInputRef = useRef(null);

  // Total orders count from local shared state
  const [ordersCount, setOrdersCount] = useState(0);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cb_shared_orders') || '[]');
      const filtered = stored.filter(
        (o) => !o.user_id || o.user_id === profile?.id || o.student_email === profile?.email
      );
      setOrdersCount(filtered.length);
    } catch {}
  }, [profile]);

  // Focus name input when entering edit mode
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditing]);

  const handleStartEditing = () => {
    setName(profile?.name || '');
    setPhone(profile?.phone || '');
    setError('');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setName(profile?.name || '');
    setPhone(profile?.phone || '');
    setError('');
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: cleanPhone
      });

      setIsSaving(false);
      setSaveSuccess(true);
      setIsEditing(false);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 5000);
    } catch (err) {
      setIsSaving(false);
      setError('Failed to update profile. Please try again.');
    }
  };

  // Student Initials
  const getInitials = (str) => {
    if (!str) return 'S';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8 animate-fade-in">
      
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1EAE4] pb-4">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer border-none bg-transparent p-0"
        >
          <ArrowLeft size={16} />
          <span>Back to Restaurants</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Neon PostgreSQL: Live Connected</span>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-[#FFF0EB] text-[#FF5722] text-[10px] font-black uppercase tracking-wider">
            Student Portal
          </span>
        </div>
      </div>

      {/* Save Success Notification Banner */}
      {saveSuccess && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 flex items-center gap-3.5 animate-slide-down shadow-lg shadow-emerald-500/10">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xl font-bold">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-emerald-950 font-['Outfit']">
              Profile Details Updated in Database!
            </h4>
            <p className="text-xs text-emerald-800 mt-0.5">
              Your name and phone number have been saved to Neon PostgreSQL. Kitchens will contact you at your updated mobile number.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESPONSIVE LAYOUT: 2-Column on Desktop (lg:grid), Single-Column on Mobile */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* ============================================== */}
        {/* LEFT COLUMN: Hero Identity Card & Quick Stats   */}
        {/* ============================================== */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Hero Identity Card */}
          <div className="card-elevated p-6 sm:p-8 bg-white border border-[#F1EAE4] rounded-3xl shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-44 h-44 bg-[#FF5722]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-5">
              {/* Avatar + Verified Badge */}
              <div className="flex items-center gap-4">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-[#FF5722] via-orange-500 to-amber-400 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg shadow-[#FF5722]/25 border-2 border-[#FFD3C4] shrink-0">
                  {getInitials(profile?.name)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider">
                      Verified Student
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] font-['Outfit'] tracking-tight leading-snug">
                    {profile?.name || 'Student Member'}
                  </h2>
                  <p className="text-xs text-[#64748B] font-semibold flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#FF5722]" />
                    <span>VIT-AP University</span>
                  </p>
                </div>
              </div>

              {/* Direct Details Snippet */}
              <div className="pt-2 space-y-2.5 text-xs border-t border-[#F1EAE4]">
                <div className="flex items-center gap-2.5 bg-[#FAF8F5] p-3 rounded-2xl border border-[#F1EAE4]">
                  <Phone size={15} className="text-[#FF5722] shrink-0" />
                  <span className="font-bold text-[#0F172A] font-mono text-xs sm:text-sm">
                    {profile?.phone ? `+91 ${profile.phone}` : 'No phone set'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 bg-[#FAF8F5] p-3 rounded-2xl border border-[#F1EAE4]">
                  <Mail size={15} className="text-[#3B82F6] shrink-0" />
                  <span className="truncate text-xs font-semibold text-[#475569] font-mono">
                    {profile?.email}
                  </span>
                </div>
              </div>

              {/* Hero Card Edit Profile Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="w-full py-3 px-4 rounded-2xl bg-[#FFF0EB] hover:bg-[#FF5722] text-[#FF5722] hover:text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer border border-[#FFD3C4] active:scale-98 shadow-xs"
                >
                  <Edit3 size={15} />
                  <span>Edit Profile Details</span>
                </button>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#F1EAE4] text-xs">
                <div
                  onClick={onViewOrders}
                  className="p-3.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F1EAE4]/60 border border-[#F1EAE4] cursor-pointer transition-colors"
                >
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block tracking-wider">Orders</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-base font-black font-mono text-emerald-700">{ordersCount} Placed</span>
                    <ChevronRight size={13} className="text-slate-400" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#F1EAE4]">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block tracking-wider">Destination</span>
                  <span className="text-xs sm:text-sm font-black text-[#FF5722] mt-1 block truncate">
                    Vit-ap Campus
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Nav Card: My Orders */}
          <button
            onClick={onViewOrders}
            className="w-full card-elevated p-4 sm:p-5 bg-white hover:bg-[#FAF8F5] border border-[#F1EAE4] rounded-3xl flex items-center justify-between transition-all cursor-pointer group text-left shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF0EB] text-[#FF5722] flex items-center justify-center text-xl border border-[#FFD3C4]">
                📦
              </div>
              <div>
                <h4 className="text-sm font-black text-[#0F172A] font-['Outfit'] group-hover:text-[#FF5722] transition-colors">
                  My Orders & Live Tracker
                </h4>
                <p className="text-xs text-[#64748B]">
                  Track food delivery live or view past bills
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Sign Out Card */}
          <button
            onClick={logout}
            className="w-full p-4 rounded-3xl bg-rose-50 hover:bg-rose-100/70 border border-rose-200 text-rose-700 flex items-center justify-between transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-rose-600 flex items-center justify-center text-lg border border-rose-200 shadow-xs">
                <LogOut size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-rose-900">
                  Sign Out of Account
                </h4>
                <p className="text-[11px] text-rose-600">
                  Log out on this device
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-rose-400 group-hover:translate-x-1 transition-transform" />
          </button>

        </div>

        {/* ============================================== */}
        {/* RIGHT COLUMN: Profile Details & Edit Option    */}
        {/* ============================================== */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Card: Profile Details with Edit Option */}
          <div className="card-elevated p-6 sm:p-8 bg-white border border-[#F1EAE4] rounded-3xl space-y-6 shadow-sm">
            
            {/* Header: Title + Prominent [ EDIT ] Option Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1EAE4] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF0EB] text-[#FF5722] flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#0F172A] font-['Outfit']">
                    Student Details
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    {isEditing
                      ? 'Edit your details below and click Save Changes'
                      : 'View or update your personal contact information'}
                  </p>
                </div>
              </div>

              {/* THE PROMINENT EDIT BUTTON */}
              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="py-2.5 px-5 rounded-2xl bg-[#FF5722] hover:bg-[#F4511E] text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#FF5722]/30 active:scale-95 group"
                  title="Click to edit your name and phone number"
                >
                  <Edit3 size={16} className="group-hover:rotate-12 transition-transform" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
                >
                  <X size={15} />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW MODE: When not editing, show clean readonly cards   */}
            {/* ======================================================== */}
            {!isEditing ? (
              <div className="space-y-4 animate-fade-in">
                
                {/* Full Name Card */}
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#F1EAE4] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Full Student Name
                    </span>
                    <span className="text-sm sm:text-base font-black text-[#0F172A] font-['Outfit'] mt-0.5 block">
                      {profile?.name || 'Not provided'}
                    </span>
                  </div>
                  <button
                    onClick={handleStartEditing}
                    className="py-1.5 px-3 rounded-xl bg-[#FFF0EB] hover:bg-[#FF5722] text-[#FF5722] hover:text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border border-[#FFD3C4]"
                  >
                    <Edit3 size={12} />
                    <span>Edit</span>
                  </button>
                </div>

                {/* Mobile Phone Number Card */}
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#F1EAE4] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Mobile Phone Number
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm sm:text-base font-black font-mono text-[#0F172A]">
                        {profile?.phone ? `+91 ${profile.phone}` : 'No phone added'}
                      </span>
                      {profile?.phone && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                          Active for Delivery
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleStartEditing}
                    className="py-1.5 px-3 rounded-xl bg-[#FFF0EB] hover:bg-[#FF5722] text-[#FF5722] hover:text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border border-[#FFD3C4]"
                  >
                    <Edit3 size={12} />
                    <span>Edit</span>
                  </button>
                </div>

                {/* Email Address Card */}
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#F1EAE4] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Email Address
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-slate-700 mt-0.5 block truncate">
                      {profile?.email}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono bg-white px-2 py-1 rounded-md border border-slate-200">
                    Account ID
                  </span>
                </div>

                {/* Edit Invitation CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartEditing}
                    className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
                  >
                    <Edit3 size={16} />
                    <span>Click here to Edit & Update Details</span>
                  </button>
                </div>

              </div>
            ) : (
              /* ======================================================== */
              /* EDIT MODE: Active Inputs & Direct Save to Database       */
              /* ======================================================== */
              <form onSubmit={handleSave} className="space-y-4 animate-scale-in">
                
                {/* Full Name Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0F172A] flex items-center justify-between">
                    <span>Full Student Name <span className="text-[#FF5722]">*</span></span>
                    <span className="text-[10px] text-slate-400 font-normal">Printed on kitchen food bills</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={nameInputRef}
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter full name (e.g. Aryan Sharma)"
                      className="w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold bg-white border-2 border-[#FF5722] text-[#0F172A] focus:ring-4 focus:ring-[#FF5722]/15 outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Mobile Number Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0F172A] flex items-center justify-between">
                    <span>Mobile Phone Number <span className="text-[#FF5722]">*</span></span>
                    <span className="text-[10px] text-slate-400 font-normal">Contact for Vit-ap Campus drop</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-xs font-mono font-black text-[#FF5722] select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      className="w-full py-3.5 pl-14 pr-4 rounded-2xl text-xs sm:text-sm font-mono font-bold bg-white border-2 border-[#FF5722] text-[#0F172A] focus:ring-4 focus:ring-[#FF5722]/15 outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Email Read-only Display */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">
                    Registered Email Address (Account Key)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ''}
                    className="w-full py-3 px-4 rounded-2xl text-xs font-mono bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed select-none"
                  />
                </div>

                {/* Save and Cancel Action Buttons */}
                <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl btn-primary text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer border-none shadow-lg shadow-[#FF5722]/25 active:scale-98 transition-all"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Updating Database Records...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Updated Details in Database</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer border border-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            )}

          </div>

          {/* Campus Delivery Destination Box */}
          <div className="card-elevated p-6 bg-white border border-[#F1EAE4] rounded-3xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#FF5722]" />
                <h4 className="text-sm font-extrabold text-[#0F172A] font-['Outfit']">
                  Campus Handover Destination
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase border border-emerald-200">
                Fixed at Vit-ap Campus
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#F1EAE4] space-y-1">
              <span className="font-extrabold text-xs text-[#0F172A] block">
                Vit-ap Campus — Delivery Dispatch Point
              </span>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Vit: Mute Bites is exclusively customized for VIT-AP. Freshly packed food from campus kitchens is handed over directly to you at Vit-ap Campus.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
