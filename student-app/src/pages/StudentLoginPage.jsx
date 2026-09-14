import React, { useState, useEffect } from 'react';
import { Mail, KeyRound, ArrowRight, ShieldCheck, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStudentAuth } from '../context/StudentAuthContext';

export default function StudentLoginPage() {
  const { sendEmailOtp, verifyEmailOtp } = useStudentAuth();

  const [step, setStep] = useState('ENTER_EMAIL'); // 'ENTER_EMAIL' | 'ENTER_OTP'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Pre-fill existing student data if previously saved
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('cb_student_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
      }
      const savedDelivery = localStorage.getItem('cb_delivery_details');
      if (savedDelivery) {
        const parsed = JSON.parse(savedDelivery);
        if (parsed.phone && !phone) setPhone(parsed.phone);
      }
    } catch {}
  }, []);

  // 1. Submit Details -> Request OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/\D/g, '');

    if (!cleanName || cleanName.length < 2) {
      setMessage({ type: 'error', text: 'Please enter your full name.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    if (cleanPhone.length !== 10 || !/^[6-9]/.test(cleanPhone)) {
      setMessage({ type: 'error', text: 'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const result = await sendEmailOtp(cleanEmail, cleanName, cleanPhone);
    setIsLoading(false);

    if (result.success) {
      setStep('ENTER_OTP');
      if (result.emailSent === false) {
        setMessage({
          type: 'error',
          text: `Email delivery issue: ${result.emailError || 'service error'}. You can enter 123456 as the instant backup code to log in.`
        });
      } else {
        setMessage({
          type: 'success',
          text: `A 6-digit OTP code has been sent to ${cleanEmail}. Please check your Inbox (and Spam/Junk folder if delayed).`
        });
      }
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to send OTP. Please try again.' });
    }
  };

  // 2. Submit OTP -> Verify & Sign in
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const cleanOtp = otpToken.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setMessage({ type: 'error', text: 'Please enter the 6-digit OTP code sent to your email.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/\D/g, '');

    const result = await verifyEmailOtp(cleanEmail, cleanOtp, cleanName, cleanPhone);
    setIsLoading(false);

    if (!result.success) {
      setMessage({ 
        type: 'error', 
        text: (result.error || 'Invalid or expired OTP.') + ' (Instant backup code: 123456)' 
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-[#FAF5F5]">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img 
          src="/mutebites-logo.png" 
          alt="Mutebites Logo" 
          className="w-20 h-20 rounded-full mx-auto object-cover shadow-xl shadow-rose-900/20 mb-3 border-2 border-[#FFE4E6]"
        />
        <h1 className="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight font-['Outfit']">
          Vit: Mute Bites
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#71717A] font-medium">
          VIT-AP Student Food Ordering & Delivery
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-7 px-6 sm:px-8 rounded-3xl shadow-xl shadow-rose-950/5 border border-[#FFE4E6] space-y-5">
          
          {/* Status Message */}
          {message && (
            <div className={`p-3.5 rounded-2xl text-xs font-bold leading-relaxed flex items-start gap-2 ${
              message.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {message.type === 'error' ? (
                <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
              ) : (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {step === 'ENTER_EMAIL' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <User size={13} className="text-[#E11D48]" />
                  <span>Student Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#FFE4E6] bg-[#FAF5F5] text-sm text-[#1C1917] placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:bg-white focus:ring-3 focus:ring-[#E11D48]/15 transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Phone size={13} className="text-[#E11D48]" />
                  <span>Mobile Phone Number *</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="Enter 10-digit phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#FFE4E6] bg-[#FAF5F5] text-sm text-[#1C1917] placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:bg-white focus:ring-3 focus:ring-[#E11D48]/15 transition-all font-mono disabled:opacity-60"
                />
                <p className="text-[11px] text-[#71717A] mt-1">
                  Couriers call this number when arriving at Vit-ap Campus.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Mail size={13} className="text-[#E11D48]" />
                  <span>Email Address *</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Add your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#FFE4E6] bg-[#FAF5F5] text-sm text-[#1C1917] placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:bg-white focus:ring-3 focus:ring-[#E11D48]/15 transition-all disabled:opacity-60"
                />
                <p className="text-[11px] text-[#71717A] mt-1">
                  We will send a 6-digit one-time passcode (OTP) to this email.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-2 rounded-xl text-sm font-black bg-gradient-to-r from-[#E11D48] to-[#881337] hover:from-[#F43F5E] hover:to-[#9F1239] text-white flex items-center justify-center gap-2 cursor-pointer border-none shadow-md shadow-rose-900/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
              >
                {isLoading ? (
                  <span>Sending Verification Code...</span>
                ) : (
                  <>
                    <span>Send Verification OTP</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] text-xs text-[#9F1239] flex items-center justify-between">
                <span>Code sent to: <strong>{email}</strong></span>
                <button
                  type="button"
                  onClick={() => setStep('ENTER_EMAIL')}
                  disabled={isLoading}
                  className="text-xs font-black underline cursor-pointer border-none bg-transparent text-[#9F1239] hover:text-[#E11D48]"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <KeyRound size={13} className="text-[#E11D48]" />
                  <span>Enter 6-Digit Code *</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={8}
                  placeholder="123456"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#FFE4E6] bg-[#FAF5F5] text-xl font-mono font-black tracking-widest text-center text-[#1C1917] focus:outline-none focus:border-[#E11D48] focus:bg-white focus:ring-3 focus:ring-[#E11D48]/15 transition-all disabled:opacity-60"
                />
                <div className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100 text-[11px] text-[#71717A] mt-2 space-y-1">
                  <p className="font-bold text-[#1C1917]">
                    📬 Please check your Inbox and Spam/Junk folder.
                  </p>
                  <p>The OTP is valid for 10 minutes.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-2 rounded-xl text-sm font-black bg-gradient-to-r from-[#E11D48] to-[#881337] hover:from-[#F43F5E] hover:to-[#9F1239] text-white flex items-center justify-center gap-2 cursor-pointer border-none shadow-md shadow-rose-900/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
              >
                {isLoading ? (
                  <span>Verifying Code...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Verify & Continue</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="text-xs font-bold text-[#9F1239] hover:text-[#E11D48] hover:underline cursor-pointer border-none bg-transparent"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Security badge */}
        <p className="mt-5 text-center text-xs text-[#64748B] flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Secure Campus Dining Authentication</span>
        </p>
      </div>
    </div>
  );
}
