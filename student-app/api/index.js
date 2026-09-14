import ordersHandler from './_handlers/orders.js';
import menuHandler from './_handlers/menu.js';
import restaurantsHandler from './_handlers/restaurants.js';
import restaurantsToggleHandler from './_handlers/restaurants-toggle.js';
import settingsHandler from './_handlers/settings.js';
import studentsHandler from './_handlers/students.js';
import sendOtpHandler from './_handlers/auth-send-otp.js';
import verifyOtpHandler from './_handlers/auth-verify-otp.js';
import adminLoginHandler from './_handlers/auth-admin-login.js';
import riderHandler from './_handlers/rider.js';

export default async function handler(req, res) {
  // Global CORS Headers & Preflight Handling
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract clean URL & pathname
  const rawPath = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
  let currentUrl = req.url || '';
  if (currentUrl === '/api/index.js' || currentUrl.startsWith('/api/index.js?')) {
    if (rawPath) {
      currentUrl = rawPath;
    }
  }

  const [pathOnly, queryString] = currentUrl.split('?');
  const pathname = pathOnly.replace(/\/$/, '') || '/';

  // Ensure req.query is populated
  if (!req.query) {
    req.query = {};
  }
  if (queryString) {
    const params = new URLSearchParams(queryString);
    for (const [k, v] of params.entries()) {
      req.query[k] = v;
    }
  }

  // 1. Auth routes
  if (pathname === '/api/auth/send-otp') {
    return sendOtpHandler(req, res);
  }
  if (pathname === '/api/auth/verify-otp') {
    return verifyOtpHandler(req, res);
  }
  if (pathname === '/api/auth/admin-login') {
    return adminLoginHandler(req, res);
  }

  // 2. Settings routes
  if (pathname === '/api/settings/ordering' || pathname === '/api/settings') {
    return settingsHandler(req, res);
  }

  // 3. Restaurant routes
  if (pathname.includes('/toggle') || req.body?.action === 'toggle') {
    return restaurantsToggleHandler(req, res);
  }
  if (pathname.startsWith('/api/restaurants')) {
    return restaurantsHandler(req, res);
  }

  // 4. Menu routes
  if (pathname.startsWith('/api/menu')) {
    return menuHandler(req, res);
  }

  // 5. Rider routes
  if (pathname.startsWith('/api/rider')) {
    return riderHandler(req, res);
  }

  // 6. Student profile routes
  if (pathname.startsWith('/api/students')) {
    return studentsHandler(req, res);
  }

  // 7. Orders routes
  if (pathname.startsWith('/api/orders')) {
    return ordersHandler(req, res);
  }

  // 8. Health check
  if (pathname === '/api' || pathname === '/api/health') {
    return res.status(200).json({ ok: true, message: 'Vit: Mute Bites API is live', timestamp: new Date().toISOString() });
  }

  return res.status(404).json({ success: false, error: 'Endpoint not found', path: pathname });
}
