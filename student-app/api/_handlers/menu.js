import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_1vc6drlGiWJT@ep-billowing-cake-b4cx6gae-pooler.c-6.us-east-2.aws.neon.tech/mute%20bites?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

function formatMenuItem(r) {
  if (!r) return null;
  const isAvailable = r.is_available !== false && r.is_available !== 'false' && r.is_available !== 0;
  return {
    ...r,
    id: r.id,
    restaurant_id: r.restaurant_id,
    restaurantId: r.restaurant_id,
    restaurant_name: r.restaurant_name,
    restaurantName: r.restaurant_name,
    name: r.name,
    description: r.description || '',
    price: Number(r.price),
    category: r.category,
    is_veg: Boolean(r.is_veg),
    is_available: isAvailable,
    isAvailable: isAvailable,
    image_url: r.image_url || '',
    imageUrl: r.image_url || '',
    preparation_time: r.preparation_time || '10-15 mins',
    prep_time: r.preparation_time || '10-15 mins',
    preparationTime: r.preparation_time || '10-15 mins',
    rating: Number(r.rating || 4.8),
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse path & params
  const rawUrl = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.url || '';
  const [pathOnly] = rawUrl.split('?');
  const pathname = pathOnly.replace(/\/$/, '') || '/';
  const query = req.query || {};
  const body = req.body || {};

  // Check URL paths:
  // 1) /api/menu/bulk-availability
  const isBulkAvailability = pathname.endsWith('/bulk-availability') || body.action === 'bulk_availability';

  // 2) /api/menu/:id/availability or body toggle_availability
  const availabilityMatch = pathname.match(/\/api\/menu\/([^/?]+)\/availability/i);
  const isSingleAvailability = Boolean(availabilityMatch) || 
    pathname.endsWith('/availability') || 
    body.action === 'toggle_availability' || 
    query.action === 'toggle_availability';

  // 3) /api/menu/:id (where segment is not a sub-action keyword)
  let pathItemId = null;
  const itemMatch = pathname.match(/\/api\/menu\/([^/?]+)/i);
  if (itemMatch && itemMatch[1]) {
    const seg = decodeURIComponent(itemMatch[1]);
    if (seg !== 'bulk-availability' && seg !== 'availability' && seg !== 'delete' && seg !== 'status') {
      pathItemId = seg;
    }
  }

  // ----------------------------------------------------
  // A. BULK AVAILABILITY TOGGLE
  // ----------------------------------------------------
  if (isBulkAvailability && (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT')) {
    try {
      const restaurantId = body.restaurant_id || body.restaurantId || query.restaurant_id || query.restaurantId;
      const isAvailable = body.is_available !== undefined 
        ? Boolean(body.is_available) 
        : (body.isAvailable !== undefined ? Boolean(body.isAvailable) : true);

      if (restaurantId && restaurantId !== 'ALL' && restaurantId !== 'all') {
        await sql`
          UPDATE menu_items 
          SET is_available = ${isAvailable}, updated_at = NOW() 
          WHERE restaurant_id = ${restaurantId};
        `;
      } else {
        await sql`
          UPDATE menu_items 
          SET is_available = ${isAvailable}, updated_at = NOW();
        `;
      }

      console.log(`[Neon DB] Bulk availability updated for ${restaurantId || 'all'} to ${isAvailable}`);
      return res.status(200).json({ success: true, restaurantId, is_available: isAvailable });
    } catch (err) {
      console.error('[Menu Bulk Availability Error]:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ----------------------------------------------------
  // B. SINGLE ITEM AVAILABILITY TOGGLE
  // ----------------------------------------------------
  if (isSingleAvailability) {
    const targetId = (availabilityMatch && availabilityMatch[1]) || pathItemId || body.id || body.itemId || query.id || query.itemId;
    const isAvailable = body.is_available !== undefined 
      ? Boolean(body.is_available) 
      : (body.isAvailable !== undefined ? Boolean(body.isAvailable) : true);

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'Item ID is required to toggle availability.' });
    }

    try {
      const result = await sql`
        UPDATE menu_items 
        SET is_available = ${isAvailable}, updated_at = NOW() 
        WHERE id = ${targetId}
        RETURNING *;
      `;
      console.log(`[Neon DB] Menu item #${targetId} availability updated to ${isAvailable}`);
      return res.status(200).json({ success: true, id: targetId, is_available: isAvailable, item: formatMenuItem(result?.[0]) });
    } catch (err) {
      console.error('[Menu Toggle Availability Error]:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ----------------------------------------------------
  // C. DELETE DISH
  // ----------------------------------------------------
  const isDelete = req.method === 'DELETE' || pathname.endsWith('/delete') || body.action === 'delete';
  if (isDelete) {
    const targetId = pathItemId || query.id || query.itemId || body.id || body.itemId;
    const restaurantId = query.restaurant_id || query.restaurantId || body.restaurant_id;

    try {
      if (targetId && targetId !== 'all') {
        await sql`DELETE FROM menu_items WHERE id = ${targetId};`;
        console.log(`[Neon DB] Dish #${targetId} deleted.`);
        return res.status(200).json({ success: true, message: `Dish #${targetId} permanently deleted.` });
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

  // ----------------------------------------------------
  // D. UPDATE DISH (PUT /api/menu/:id, PUT /api/menu, or PATCH)
  // ----------------------------------------------------
  const isUpdate = req.method === 'PUT' || 
    (req.method === 'PATCH' && !isSingleAvailability) ||
    (req.method === 'POST' && (Boolean(pathItemId) || (body.id && body.price !== undefined)));

  if (isUpdate) {
    const targetId = pathItemId || body.id || body.itemId || query.id;
    if (!targetId) {
      return res.status(400).json({ success: false, error: 'Dish ID is required for update.' });
    }

    try {
      const name = (body.name || '').trim();
      const price = Number(body.price) || 0;
      const category = (body.category || 'Special Dishes').trim();
      const restaurantId = body.restaurant_id || body.restaurantId || 'bheemasena-restaurant';
      const restaurantName = body.restaurant_name || body.restaurantName || 
        (restaurantId === 'bismillah-fruit-juice' ? 'Bismillah Fruit Juice' :
         restaurantId === 'a1-biryani-point' ? 'A1 Biryani Point' : 'Bheemasena Restaurant');
      const description = body.description || '';
      const prepTime = body.preparation_time || body.preparationTime || body.prep_time || '10-15 mins';
      const imageUrl = body.image_url || body.imageUrl || '';
      const isVeg = body.is_veg !== undefined ? Boolean(body.is_veg) : (body.isVeg !== undefined ? Boolean(body.isVeg) : true);
      const isAvailable = body.is_available !== undefined ? Boolean(body.is_available) : (body.isAvailable !== undefined ? Boolean(body.isAvailable) : true);
      const rating = Number(body.rating || 4.8);

      const result = await sql`
        INSERT INTO menu_items (
          id, restaurant_id, restaurant_name, name, description, price,
          category, is_veg, is_available, image_url, preparation_time, rating,
          created_at, updated_at
        ) VALUES (
          ${targetId}, ${restaurantId}, ${restaurantName}, ${name}, ${description}, ${price},
          ${category}, ${isVeg}, ${isAvailable}, ${imageUrl}, ${prepTime}, ${rating},
          NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          restaurant_id = EXCLUDED.restaurant_id,
          restaurant_name = EXCLUDED.restaurant_name,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          category = EXCLUDED.category,
          is_veg = EXCLUDED.is_veg,
          is_available = EXCLUDED.is_available,
          image_url = EXCLUDED.image_url,
          preparation_time = EXCLUDED.preparation_time,
          rating = EXCLUDED.rating,
          updated_at = NOW()
        RETURNING *;
      `;

      console.log(`[Neon DB] Dish #${targetId} (${name}) updated successfully.`);
      const item = formatMenuItem(result?.[0]);
      return res.status(200).json({ success: true, item });
    } catch (err) {
      console.error('[Menu PUT/UPDATE Error]:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ----------------------------------------------------
  // E. CREATE DISH (POST /api/menu)
  // ----------------------------------------------------
  if (req.method === 'POST') {
    try {
      const targetId = body.id || ('dish_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
      const name = (body.name || 'New Dish').trim();
      const price = Number(body.price) || 0;
      const category = (body.category || 'Special Dishes').trim();
      const restaurantId = body.restaurant_id || body.restaurantId || 'bheemasena-restaurant';
      const restaurantName = body.restaurant_name || body.restaurantName || 
        (restaurantId === 'bismillah-fruit-juice' ? 'Bismillah Fruit Juice' :
         restaurantId === 'a1-biryani-point' ? 'A1 Biryani Point' : 'Bheemasena Restaurant');
      const description = body.description || '';
      const prepTime = body.preparation_time || body.preparationTime || body.prep_time || '10-15 mins';
      const imageUrl = body.image_url || body.imageUrl || '';
      const isVeg = body.is_veg !== undefined ? Boolean(body.is_veg) : (body.isVeg !== undefined ? Boolean(body.isVeg) : true);
      const isAvailable = body.is_available !== undefined ? Boolean(body.is_available) : (body.isAvailable !== undefined ? Boolean(body.isAvailable) : true);
      const rating = Number(body.rating || 4.8);

      const result = await sql`
        INSERT INTO menu_items (
          id, restaurant_id, restaurant_name, name, description, price,
          category, is_veg, is_available, image_url, preparation_time, rating,
          created_at, updated_at
        ) VALUES (
          ${targetId}, ${restaurantId}, ${restaurantName}, ${name}, ${description}, ${price},
          ${category}, ${isVeg}, ${isAvailable}, ${imageUrl}, ${prepTime}, ${rating},
          NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          restaurant_id = EXCLUDED.restaurant_id,
          restaurant_name = EXCLUDED.restaurant_name,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          category = EXCLUDED.category,
          is_veg = EXCLUDED.is_veg,
          is_available = EXCLUDED.is_available,
          image_url = EXCLUDED.image_url,
          preparation_time = EXCLUDED.preparation_time,
          rating = EXCLUDED.rating,
          updated_at = NOW()
        RETURNING *;
      `;

      console.log(`[Neon DB] New dish #${targetId} (${name}) created successfully.`);
      const item = formatMenuItem(result?.[0]);
      return res.status(201).json({ success: true, item });
    } catch (err) {
      console.error('[Menu POST/CREATE Error]:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ----------------------------------------------------
  // F. GET MENU ITEMS
  // ----------------------------------------------------
  if (req.method === 'GET') {
    const { restaurant_id, restaurantId, available_only } = query;
    const targetRestaurant = restaurant_id || restaurantId;

    try {
      let rows;
      if (targetRestaurant && targetRestaurant !== 'all' && targetRestaurant !== 'ALL') {
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

      const items = rows.map(formatMenuItem);
      return res.status(200).json(items);
    } catch (err) {
      console.error('[Menu GET Error]:', err.message);
      return res.status(500).json({ error: 'Failed to fetch menu items: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
