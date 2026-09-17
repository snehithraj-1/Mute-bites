import { sql } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.body || {};

    // Robustly extract ID from URL path (e.g. /api/restaurants/bheemasena-restaurant/toggle)
    let urlId = null;
    const rawUrl = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.url || '';
    const match = rawUrl.match(/\/api\/restaurants\/([^/?]+)(?:\/toggle)?/i);
    if (match && match[1] && match[1].toLowerCase() !== 'toggle') {
      urlId = decodeURIComponent(match[1]);
    }

    const id = body.id || body.restaurantId || body.restaurant_id || req.query?.id || urlId;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Restaurant ID is required.' });
    }

    let nextStatus = body.is_open !== undefined ? Boolean(body.is_open) : undefined;
    if (body.isOpen !== undefined) {
      nextStatus = Boolean(body.isOpen);
    }
    if (body.status !== undefined) {
      nextStatus = body.status === 'OPEN' || body.status === true;
    }

    if (nextStatus === undefined) {
      const current = await sql`SELECT is_open FROM restaurants WHERE id = ${id} LIMIT 1;`;
      if (current && current.length > 0) {
        nextStatus = !current[0].is_open;
      } else {
        nextStatus = true;
      }
    }

    await sql`
      UPDATE restaurants
      SET is_open = ${nextStatus}, updated_at = NOW()
      WHERE id = ${id};
    `;

    console.log(`[Neon DB] Restaurant #${id} is_open updated to: ${nextStatus}`);

    return res.status(200).json({ success: true, id, is_open: nextStatus });
  } catch (err) {
    console.error('[Restaurant Toggle Error]:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to toggle restaurant: ' + err.message });
  }
}
