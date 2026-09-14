import app from '../server/server.js';

export default function handler(req, res) {
  // Normalize req.url if Vercel serverless rewrite pointed directly to /api/index.js
  if (req.url === '/api/index.js' || req.url.startsWith('/api/index.js?')) {
    const rawPath = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
    if (rawPath) {
      req.url = rawPath;
    }
  }
  return app(req, res);
}

