import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const StudentAuthContext = createContext(null);

export function StudentAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('cb_student_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync profile to localStorage for persistence
  useEffect(() => {
    try {
      if (profile) {
        localStorage.setItem('cb_student_profile', JSON.stringify(profile));
      } else {
        localStorage.removeItem('cb_student_profile');
      }
    } catch (err) {
      console.error(err);
    }
  }, [profile]);

  // Listen to live Supabase Auth state changes if configured
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return;
    }

    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.warn('[Supabase Auth] Session fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Fetch or create profile from Supabase
  const fetchProfile = async (userId) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
        return data;
      }
    } catch (err) {
      console.warn('[Supabase Profile] Fetch error:', err);
    }
    return null;
  };

  // 1. Send Real Email OTP via Gmail Backend
  const sendEmailOtp = async (email, name = '', phone = '') => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name, phone })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to send OTP to email.');
      }
      return { 
        success: true, 
        message: data.message,
        otp: data.otp,
        emailSent: data.emailSent,
        emailError: data.emailError,
        fallbackCode: data.fallbackCode || '123456'
      };
    } catch (err) {
      console.error('[Send OTP Error]:', err);
      return { success: false, error: err.message };
    }
  };

  // 2. Verify Real Email OTP via Backend & Neon DB
  const verifyEmailOtp = async (email, token, name = '', phone = '') => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: token.trim(), name, phone })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Invalid or expired OTP code.');
      }

      const studentUser = data.user || {
        id: 'student-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
        name: name.trim() || splitEmailName(cleanEmail),
        email: cleanEmail,
        phone: phone.trim() || '9989955833',
        role: 'student'
      };

      setUser({ id: studentUser.id, email: cleanEmail });
      setProfile(studentUser);

      // Sync delivery details phone with logged in student
      try {
        const savedDeliv = localStorage.getItem('cb_delivery_details');
        const parsedDeliv = savedDeliv ? JSON.parse(savedDeliv) : {};
        localStorage.setItem('cb_delivery_details', JSON.stringify({
          ...parsedDeliv,
          phone: studentUser.phone,
          deliveryLocation: 'Vit-ap Campus'
        }));
      } catch {}

      return { success: true, profile: studentUser };
    } catch (err) {
      console.error('[Verify OTP Error]:', err);
      return { success: false, error: err.message };
    }
  };

  // Update Profile details
  const updateProfile = async ({ name, phone, email }) => {
    const updated = {
      ...profile,
      name: name !== undefined ? name.trim() : profile?.name,
      phone: phone !== undefined ? phone.trim() : profile?.phone,
      email: email !== undefined ? email.trim().toLowerCase() : profile?.email,
      updated_at: new Date().toISOString()
    };

    setProfile(updated);
    try {
      localStorage.setItem('cb_student_profile', JSON.stringify(updated));
    } catch {}

    // Also update delivery details in localStorage
    try {
      const savedDeliv = localStorage.getItem('cb_delivery_details');
      const parsedDeliv = savedDeliv ? JSON.parse(savedDeliv) : {};
      localStorage.setItem('cb_delivery_details', JSON.stringify({
        ...parsedDeliv,
        phone: updated.phone,
        deliveryLocation: 'Vit-ap Campus'
      }));
    } catch {}

    // 1. Sync to Neon PostgreSQL
    try {
      await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.warn('[Sync to Neon DB Error]:', e.message);
    }

    // 2. Sync to Supabase if configured
    if (isSupabaseConfigured() && supabase && profile?.id) {
      try {
        await supabase.from('profiles').upsert(updated);
      } catch (err) {
        console.warn('[Supabase Profile Update Error]:', err.message);
      }
    }

    return { success: true, profile: updated };
  };

  // Sign out
  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn(err);
      }
    }
    setUser(null);
    setProfile(null);
    try {
      localStorage.removeItem('cb_delivery_details');
    } catch {}
  };

  return (
    <StudentAuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: Boolean(profile && profile.role === 'student'),
        sendEmailOtp,
        verifyEmailOtp,
        updateProfile,
        logout,
        isConfigured: isSupabaseConfigured()
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within StudentAuthProvider');
  }
  return context;
}

function splitEmailName(email) {
  if (!email) return 'Student';
  const namePart = email.split('@')[0].replace(/[._]/g, ' ');
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}
