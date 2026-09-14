import React from 'react';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ErrorBoundary from './components/ErrorBoundary';

function AdminAppInner() {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center space-y-4 text-white">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
        <p className="text-xs font-bold text-slate-400">Loading Vit: Mute Bites Admin Portal...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginPage />;
  }

  return (
    <ErrorBoundary>
      <AdminDashboardPage />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <AdminAppInner />
    </AdminAuthProvider>
  );
}
