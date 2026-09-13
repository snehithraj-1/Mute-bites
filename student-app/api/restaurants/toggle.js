import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_3O6tHydAMuSg@ep-soft-flower-a5yk954q-pooler.us-east-2.aws.neon.tech/Mutebites?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.body || {};
    const id = body.id || body.restaurantId || body.restaurant_id || req.query.id;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Restaurant ID is required.' });
    }

    let nextStatus = body.is_open !== undefined ? Boolean(body.is_open) : undefined;

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

    return res.status(200).json({ success: true, id, is_open: nextStatus });
  } catch (err) {
    console.error('[Restaurant Toggle Error]:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to toggle restaurant: ' + err.message });
  }
}
