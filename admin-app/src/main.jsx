import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Automatically route /api requests to the live backend when running on a standalone domain
const getBackendUrl = () => {
  // 1. Explicit environment variable set in Vercel
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    // 2. Browser localStorage override if set
    const saved = localStorage.getItem('cb_api_url');
    if (saved) {
      return saved.replace(/\/$/, '');
    }

    const host = window.location.hostname;
    // Localhost development uses Vite proxy to port 5000
    if (host === 'localhost' || host === '127.0.0.1') {
      return '';
    }
  }
  return '';
};

const backendBase = getBackendUrl();
if (backendBase) {
  const originalFetch = window.fetch;
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return originalFetch(`${backendBase}${input}`, init);
    }
    if (typeof Request !== 'undefined' && input instanceof Request && input.url.startsWith('/api')) {
      return originalFetch(new Request(`${backendBase}${input.url}`, input));
    }
    return originalFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
