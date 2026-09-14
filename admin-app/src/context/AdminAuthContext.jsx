import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('cb_admin_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'super_admin' || parsed.role === 'admin' || parsed.role === 'restaurant_admin')) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [unauthorizedError, setUnauthorizedError] = useState('');

  // Persist admin session
  useEffect(() => {
    try {
      if (profile && (profile.role === 'super_admin' || profile.role === 'admin' || profile.role === 'restaurant_admin')) {
        localStorage.setItem('cb_admin_profile', JSON.stringify(profile));
      } else {
        localStorage.removeItem('cb_admin_profile');
      }
    } catch (e) {
      console.error(e);
    }
  }, [profile]);

  // Initial Supabase Session Check
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return;
    }

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await verifyAndSetAdmin(session.user);
        }
      } catch (err) {
        console.warn('Admin session check error:', err);
      } finally {
        setLoading(false);
      }
    }

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await verifyAndSetAdmin(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const verifyAndSetAdmin = async (authUser) => {
    if (!supabase) return false;

    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error || !userProfile) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setUnauthorizedError('Unauthorized access. Only authorized administrators can access this portal.');
        return false;
      }

      const validRoles = ['admin', 'super_admin', 'restaurant_admin'];
      if (!validRoles.includes(userProfile.role)) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setUnauthorizedError('Unauthorized access. Access restricted to authorized administrative staff.');
        return false;
      }

      setUser(authUser);
      setProfile(userProfile);
      setUnauthorizedError('');
      return true;
    } catch (err) {
      setUnauthorizedError('Failed to verify administrator credentials.');
      return false;
    }
  };

  // Multi-Role Admin Login: Supports Super Admin, Local Home Kitchen, CLG Bites
  const loginAdmin = async (identifier, password) => {
    setUnauthorizedError('');

    const cleanInput = identifier ? identifier.trim() : '';
    const cleanPassword = password ? password.trim() : '';

    if (!cleanInput || !cleanPassword) {
      return { success: false, error: 'Please enter username/email and password.' };
    }

    // 1. Authenticate via Backend API
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanInput, email: cleanInput, password: cleanPassword })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setProfile(data.user);
        setUser({ id: data.user.id, email: data.user.email, role: data.user.role });
        setUnauthorizedError('');
        try {
          localStorage.setItem('cb_admin_profile', JSON.stringify(data.user));
        } catch {}
        return { success: true, user: data.user };
      } else {
        return {
          success: false,
          error: data.error || 'Invalid administrator credentials. Access restricted to authorized staff.'
        };
      }
    } catch (apiErr) {
      // Direct credential fallback check
      const lowerInput = cleanInput.toLowerCase();
      if ((lowerInput === 'collagebites1@gmail.com' || lowerInput === 'collagebites@gmail.com' || lowerInput === 'rajsrmap2@gmail.com' || lowerInput === 'superadmin' || lowerInput === 'admin@collegebites.com' || lowerInput === 'admin@campusbites.com') && (cleanPassword === 'Clgbites123' || cleanPassword === 'Snehith@007' || cleanPassword === 'admin123')) {
        const superProfile = {
          id: 'admin-super',
          username: 'collagebites1@gmail.com',
          name: 'Vit: Mute Bites (Super Admin)',
          email: 'collagebites1@gmail.com',
          role: 'super_admin',
          restaurant_id: null,
          created_at: new Date().toISOString()
        };
        setProfile(superProfile);
        setUser({ id: superProfile.id, email: superProfile.email });
        try { localStorage.setItem('cb_admin_profile', JSON.stringify(superProfile)); } catch {}
        return { success: true, user: superProfile };
      }

      if ((lowerInput === 'bheemasena_admin' || lowerInput === 'bheemasena@mutebites.com' || lowerInput === 'bheemasena') && cleanPassword === 'Bheema@Campus2026') {
        const bheemaProfile = {
          id: 'admin-bheemasena',
          username: 'bheemasena_admin',
          name: 'Bheemasena Restaurant Staff',
          email: 'bheemasena@mutebites.com',
          role: 'restaurant_admin',
          restaurant_id: 'bheemasena-restaurant',
          created_at: new Date().toISOString()
        };
        setProfile(bheemaProfile);
        setUser({ id: bheemaProfile.id, email: bheemaProfile.email });
        try { localStorage.setItem('cb_admin_profile', JSON.stringify(bheemaProfile)); } catch {}
        return { success: true, user: bheemaProfile };
      }

      if ((lowerInput === 'a1_admin' || lowerInput === 'a1@mutebites.com' || lowerInput === 'a1') && cleanPassword === 'A1@Campus2026') {
        const a1Profile = {
          id: 'admin-a1',
          username: 'a1_admin',
          name: 'A1 Biryani Point Staff',
          email: 'a1@mutebites.com',
          role: 'restaurant_admin',
          restaurant_id: 'a1-biryani-point',
          created_at: new Date().toISOString()
        };
        setProfile(a1Profile);
        setUser({ id: a1Profile.id, email: a1Profile.email });
        try { localStorage.setItem('cb_admin_profile', JSON.stringify(a1Profile)); } catch {}
        return { success: true, user: a1Profile };
      }

      if ((lowerInput === 'bismillah_admin' || lowerInput === 'bismillah@mutebites.com' || lowerInput === 'bismillah') && (cleanPassword === 'Bismillah@Campus2026' || cleanPassword === 'Bismillah@2026')) {
        const bismillahProfile = {
          id: 'admin-bismillah',
          username: 'bismillah_admin',
          name: 'Bismillah Fruit Juice Staff',
          email: 'bismillah@mutebites.com',
          role: 'restaurant_admin',
          restaurant_id: 'bismillah-fruit-juice',
          created_at: new Date().toISOString()
        };
        setProfile(bismillahProfile);
        setUser({ id: bismillahProfile.id, email: bismillahProfile.email });
        try { localStorage.setItem('cb_admin_profile', JSON.stringify(bismillahProfile)); } catch {}
        return { success: true, user: bismillahProfile };
      }

      return {
        success: false,
        error: 'Invalid administrator credentials. Access restricted to authorized campus staff.'
      };
    }
  };

  // Logout
  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {}
    }
    setUser(null);
    setProfile(null);
    setUnauthorizedError('');
    try {
      localStorage.removeItem('cb_admin_profile');
    } catch {}
  };

  const isSuperAdmin = profile?.role === 'super_admin' || (profile?.role === 'admin' && !profile?.restaurant_id);
  const isRestaurantAdmin = profile?.role === 'restaurant_admin' || Boolean(profile?.restaurant_id);
  const assignedRestaurantId = profile?.restaurant_id || null;

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: Boolean(profile && (profile.role === 'super_admin' || profile.role === 'restaurant_admin' || profile.role === 'admin')),
        isSuperAdmin,
        isRestaurantAdmin,
        assignedRestaurantId,
        unauthorizedError,
        setUnauthorizedError,
        loginAdmin,
        logout,
        isConfigured: isSupabaseConfigured()
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
