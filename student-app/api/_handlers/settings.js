import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_1vc6drlGiWJT@ep-billowing-cake-b4cx6gae-pooler.c-6.us-east-2.aws.neon.tech/mute%20bites?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT ordering_enabled FROM system_settings WHERE id = 'global';`;
      const isEnabled = rows && rows.length > 0 ? rows[0].ordering_enabled !== false : true;
      return res.status(200).json({ success: true, ordering_enabled: isEnabled });
    } catch (err) {
      console.error('[Vercel Settings GET Error]:', err.message);
      return res.status(200).json({ success: true, ordering_enabled: true });
    }
  }

  if (req.method === 'POST' || req.method === 'PATCH') {
    try {
      const { ordering_enabled } = req.body || {};
      const isEnabled = ordering_enabled !== false;

      await sql`
        INSERT INTO system_settings (id, ordering_enabled, updated_at)
        VALUES ('global', ${isEnabled}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          ordering_enabled = ${isEnabled},
          updated_at = NOW();
      `;

      await sql`
        UPDATE restaurants 
        SET is_open = ${isEnabled}, updated_at = NOW();
      `;

      return res.status(200).json({ success: true, ordering_enabled: isEnabled });
    } catch (err) {
      console.error('[Vercel Settings POST Error]:', err.message);
      return res.status(500).json({ error: 'Failed to update settings: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
