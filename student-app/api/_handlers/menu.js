import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_3O6tHydAMuSg@ep-soft-flower-a5yk954q-pooler.us-east-2.aws.neon.tech/Mutebites?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // DELETE /api/menu or /api/menu?id=...
  if (req.method === 'DELETE') {
    const itemId = req.query.id || req.query.itemId || req.body?.id || req.body?.itemId;
    const restaurantId = req.query.restaurant_id || req.query.restaurantId || req.body?.restaurant_id;

    try {
      if (itemId && itemId !== 'all') {
        await sql`DELETE FROM menu_items WHERE id = ${itemId};`;
        return res.status(200).json({ success: true, message: `Dish #${itemId} permanently deleted.` });
      } else if (restaurantId) {
        await sql`DELETE FROM menu_items WHERE restaurant_id = ${restaurantId};`;
        return res.status(200).json({ success: true, message: `All dishes for restaurant ${restaurantId} cleared.` });
      } else {
        await sql`DELETE FROM menu_items;`;
        return res.status(200).json({ success: true, message: 'All menu items permanently cleared.' });
      }
    } catch (err) {
      console.error('[Menu DELETE Error]:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // PATCH / POST for availability or editing
  if (req.method === 'PATCH' || (req.method === 'POST' && req.body?.action === 'toggle_availability')) {
    const body = req.body || {};
    const itemId = body.id || req.query.id;
    const isAvailable = body.is_available !== undefined ? body.is_available : body.isAvailable;

    if (!itemId) {
      return res.status(400).json({ success: false, error: 'Item ID is required.' });
    }

    try {
      const boolVal = Boolean(isAvailable);
      await sql`UPDATE menu_items SET is_available = ${boolVal}, updated_at = NOW() WHERE id = ${itemId};`;
      return res.status(200).json({ success: true, id: itemId, is_available: boolVal });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/menu
  if (req.method === 'GET') {
    const { restaurant_id, restaurantId, available_only } = req.query;
    const targetRestaurant = restaurant_id || restaurantId;

    try {
      let rows;
      if (targetRestaurant) {
        if (available_only === 'true') {
          rows = await sql`
            SELECT * FROM menu_items 
            WHERE restaurant_id = ${targetRestaurant} AND is_available = true 
            ORDER BY category, name;
          `;
        } else {
          rows = await sql`
            SELECT * FROM menu_items 
            WHERE restaurant_id = ${targetRestaurant} 
            ORDER BY category, name;
          `;
        }
      } else {
        if (available_only === 'true') {
          rows = await sql`
            SELECT * FROM menu_items 
            WHERE is_available = true 
            ORDER BY restaurant_id, category, name;
          `;
        } else {
          rows = await sql`
            SELECT * FROM menu_items 
            ORDER BY restaurant_id, category, name;
          `;
        }
      }

      const items = rows.map(r => {
        const isAvailable = r.is_available !== false && r.is_available !== 'false' && r.is_available !== 0;
        return {
          ...r,
          price: Number(r.price),
          rating: Number(r.rating || 4.5),
          is_veg: Boolean(r.is_veg),
          is_available: isAvailable,
          isAvailable: isAvailable,
          restaurantId: r.restaurant_id,
          imageUrl: r.image_url,
          preparationTime: r.preparation_time
        };
      });

      return res.status(200).json(items);
    } catch (err) {
      console.error('[Vercel Menu GET Error]:', err.message);
      return res.status(500).json({ error: 'Failed to fetch menu items: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
