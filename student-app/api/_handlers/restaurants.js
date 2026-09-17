import { sql } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let isGlobalOrderingEnabled = true;

    try {
      const settingRows = await sql`SELECT ordering_enabled FROM system_settings WHERE id = 'global';`;
      if (settingRows && settingRows.length > 0) {
        isGlobalOrderingEnabled = settingRows[0].ordering_enabled !== false;
      }
    } catch (e) {}

    let rows = await sql`
      SELECT * FROM restaurants 
      WHERE id NOT IN ('vilasa-cafe', 'clg-bites-biryani-nation', 'local-home-kitchen', 'biryani-nation')
      ORDER BY id ASC;
    `;

    if (!isGlobalOrderingEnabled) {
      rows = rows.map(r => ({ ...r, is_open: false }));
    }

    return res.status(200).json({ success: true, restaurants: rows });
  } catch (err) {
    console.error('[Vercel Restaurants GET Error]:', err.message);
    return res.status(500).json({ error: 'Failed to fetch restaurants: ' + err.message });
  }
}
