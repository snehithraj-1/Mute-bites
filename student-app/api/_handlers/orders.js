import { sql } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.url || '';
  const [pathOnly] = rawUrl.split('?');
  const pathname = pathOnly.replace(/\/$/, '') || '/';
  const query = req.query || {};
  const body = req.body || {};

  // ----------------------------------------------------
  // 1. DELETE ORDER
  // ----------------------------------------------------
  const isDelete = req.method === 'DELETE' || 
    pathname.endsWith('/delete') || 
    body.action === 'delete' ||
    query.action === 'delete';

  if (isDelete) {
    const orderId = query.id || query.orderId || body.orderId || body.id;
    if (orderId === 'all' || query.all === 'true') {
      try {
        await sql`DELETE FROM orders;`;
        return res.status(200).json({ success: true, message: 'All orders permanently deleted.' });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required.' });
    }

    try {
      await sql`DELETE FROM orders WHERE id = ${orderId} OR id LIKE ${orderId + '%'};`;
      console.log(`[Neon DB] Order #${orderId} deleted.`);
      return res.status(200).json({ success: true, message: `Order #${orderId} permanently deleted.` });
    } catch (err) {
      console.error('[Orders Delete Error]:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ----------------------------------------------------
  // 2. STATUS UPDATE
  // ----------------------------------------------------
  const isStatusUpdate = req.method === 'PATCH' ||
    pathname.endsWith('/status') ||
    body.action === 'status' ||
    query.action === 'status' ||
    (Boolean(body.status) && !body.items && Boolean(body.orderId || body.id || query.id || query.orderId));

  if (isStatusUpdate) {
    let urlOrderId = null;
    const match = pathname.match(/\/api\/orders\/([^/?]+)(?:\/status)?/i);
    if (match && match[1] && match[1] !== 'status' && match[1] !== 'delete' && match[1] !== 'student') {
      urlOrderId = decodeURIComponent(match[1]);
    }

    const orderId = body.orderId || body.id || query.id || query.orderId || urlOrderId;
    const rawStatus = (body.status || query.status || '').toUpperCase().trim();
    const cleanStatus = (rawStatus === 'DELIVERED' || rawStatus === 'COMPLETED') ? 'COMPLETED' : (rawStatus === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED');

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required for status update.' });
    }

    try {
      let result;
      if (cleanStatus === 'COMPLETED') {
        result = await sql`
          UPDATE orders 
          SET status = ${cleanStatus}, completed_at = NOW(), updated_at = NOW() 
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'}
          RETURNING *;
        `;
      } else if (cleanStatus === 'CANCELLED') {
        result = await sql`
          UPDATE orders 
          SET status = ${cleanStatus}, cancelled_at = NOW(), updated_at = NOW() 
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'}
          RETURNING *;
        `;
      } else {
        result = await sql`
          UPDATE orders 
          SET status = ${cleanStatus}, updated_at = NOW() 
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'}
          RETURNING *;
        `;
      }

      console.log(`[Neon DB] Order #${orderId} status updated to: ${cleanStatus}`);
      return res.status(200).json({ success: true, orderId, status: cleanStatus, order: result?.[0] });
    } catch (err) {
      console.error('[Orders Status Update Error]:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ----------------------------------------------------
  // 3. GET ORDERS
  // ----------------------------------------------------
  if (req.method === 'GET') {
    try {
      // Check if student history requested via URL path: /api/orders/student/:identifier
      let studentFromPath = null;
      const studentMatch = pathname.match(/\/api\/orders\/student\/([^/?]+)/i);
      if (studentMatch && studentMatch[1]) {
        studentFromPath = decodeURIComponent(studentMatch[1]).trim().toLowerCase();
      }

      // Check if single order requested via URL path: /api/orders/:id
      let orderIdFromPath = null;
      const idMatch = pathname.match(/\/api\/orders\/([^/?]+)/i);
      if (idMatch && idMatch[1] && idMatch[1] !== 'student' && idMatch[1] !== 'status' && idMatch[1] !== 'delete') {
        orderIdFromPath = decodeURIComponent(idMatch[1]);
      }

      const orderId = query.id || query.orderId || orderIdFromPath;
      if (orderId) {
        const singleRow = await sql`
          SELECT * FROM orders 
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'} 
          LIMIT 1;
        `;
        if (singleRow && singleRow.length > 0) {
          const r = singleRow[0];
          let itemsList = [];
          try {
            itemsList = typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []);
          } catch {
            itemsList = [];
          }
          const orderObj = {
            ...r,
            id: r.id,
            total_amount: Number(r.total_amount),
            items: itemsList
          };
          return res.status(200).json({ success: true, order: orderObj });
        }
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const studentEmail = query.studentEmail || query.email || query.student_email || studentFromPath;
      const restaurantId = query.restaurantId || query.restaurant_id || query.restaurant;
      let rows = [];

      if (studentEmail && restaurantId && restaurantId !== 'all') {
        const cleanEmail = studentEmail.trim().toLowerCase();
        rows = await sql`
          SELECT * FROM orders 
          WHERE (LOWER(student_email) = ${cleanEmail} OR student_phone = ${cleanEmail} OR user_id = ${cleanEmail}) AND restaurant_id = ${restaurantId}
          ORDER BY created_at DESC;
        `;
      } else if (studentEmail) {
        const cleanEmail = studentEmail.trim().toLowerCase();
        rows = await sql`
          SELECT * FROM orders 
          WHERE (LOWER(student_email) = ${cleanEmail} OR student_phone = ${cleanEmail} OR user_id = ${cleanEmail})
          ORDER BY created_at DESC;
        `;
      } else if (restaurantId && restaurantId !== 'all') {
        rows = await sql`
          SELECT * FROM orders 
          WHERE restaurant_id = ${restaurantId}
          ORDER BY created_at DESC 
          LIMIT 100;
        `;
      } else {
        rows = await sql`
          SELECT * FROM orders 
          ORDER BY created_at DESC 
          LIMIT 100;
        `;
      }

      const formatted = rows.map(r => {
        let itemsList = [];
        try {
          itemsList = typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []);
        } catch {
          itemsList = [];
        }

        const totalNum = Number(r.total_amount) || 0;
        const studentName = r.student_name || 'Student';
        const studentPhone = r.student_phone || '';
        const studentEmailVal = r.student_email || '';
        const deliveryLocation = r.delivery_location || 'Vit-ap Campus';
        const restaurantName = r.restaurant_name || 'Campus Kitchen';
        const restaurantIdVal = r.restaurant_id || 'bheemasena-restaurant';
        const partnerName = r.delivery_partner_name || null;
        const partnerPhone = r.delivery_partner_phone || null;
        const partnerId = r.delivery_partner_id || null;

        return {
          id: r.id,
          student_name: studentName,
          student_email: studentEmailVal,
          student_phone: studentPhone,
          delivery_location: deliveryLocation,
          restaurant_id: restaurantIdVal,
          restaurant_name: restaurantName,
          total_amount: totalNum,
          status: r.status || 'CONFIRMED',
          payment_method: r.payment_method || 'cod',
          delivery_partner_id: partnerId,
          delivery_partner_name: partnerName,
          delivery_partner_phone: partnerPhone,
          created_at: r.created_at,
          updated_at: r.updated_at,
          items: itemsList,

          studentName,
          studentEmail: studentEmailVal,
          studentPhone,
          deliveryLocation,
          restaurantId: restaurantIdVal,
          restaurantName,
          totalAmount: totalNum,
          paymentMethod: r.payment_method || 'cod',
          deliveryPartner: partnerId ? {
            id: partnerId,
            name: partnerName,
            phone: partnerPhone
          } : null,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
      });

      return res.status(200).json(formatted);
    } catch (err) {
      console.error('[Orders GET Error]:', err.message);
      return res.status(500).json({ error: 'Failed to fetch orders: ' + err.message });
    }
  }

  // ----------------------------------------------------
  // 4. CREATE ORDER (POST /api/orders)
  // ----------------------------------------------------
  if (req.method === 'POST') {
    try {
      const studentName = body.student_name || body.studentName || 'Student';
      const studentPhone = body.student_phone || body.studentPhone || '';
      const studentEmail = (body.student_email || body.studentEmail || '').trim().toLowerCase();
      const deliveryLocation = body.delivery_location || body.deliveryLocation || 'Vit-ap Campus';
      const restaurantId = body.restaurant_id || body.restaurantId || 'bheemasena-restaurant';
      const restaurantName = body.restaurant_name || body.restaurantName || 'Campus Kitchen';
      const totalAmount = Number(body.total_amount ?? body.totalAmount) || 0;
      const items = Array.isArray(body.items) ? body.items : [];
      const paymentMethod = body.payment_method || body.paymentMethod || 'cod';
      const instructions = body.instructions || null;

      if (!items.length || totalAmount <= 0) {
        return res.status(400).json({ error: 'Order must contain items and a valid total amount.' });
      }

      const orderId = body.id || ('MB-' + Math.floor(100000 + Math.random() * 900000));
      const itemsJson = JSON.stringify(items);
      const nowIso = new Date().toISOString();

      await sql`
        INSERT INTO orders (
          id, student_name, student_email, student_phone,
          delivery_location, restaurant_id, restaurant_name,
          items, total_amount, status, payment_method, instructions,
          created_at, updated_at
        ) VALUES (
          ${orderId}, ${studentName}, ${studentEmail}, ${studentPhone || '8247075652'},
          ${deliveryLocation}, ${restaurantId}, ${restaurantName},
          ${itemsJson}::jsonb, ${totalAmount}, 'CONFIRMED', ${paymentMethod}, ${instructions},
          NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = NOW();
      `;

      // Concurrently upsert student profile into students table
      if (studentEmail) {
        try {
          await sql`
            INSERT INTO students (
              id, name, email, phone, hostel_block, room_number, total_orders, updated_at
            ) VALUES (
              ${body.user_id || 'student-' + Math.random().toString(36).substring(2, 9)},
              ${studentName},
              ${studentEmail},
              ${studentPhone},
              ${body.hostel_block || null},
              ${body.room_number || null},
              1,
              NOW()
            )
            ON CONFLICT (email) DO UPDATE SET
              name = EXCLUDED.name,
              phone = COALESCE(EXCLUDED.phone, students.phone),
              total_orders = students.total_orders + 1,
              updated_at = NOW();
          `;
        } catch (sErr) {
          console.warn('[Student Upsert Error]:', sErr.message);
        }
      }

      const newOrder = {
        id: orderId,
        student_name: studentName,
        studentName,
        student_email: studentEmail,
        studentEmail,
        student_phone: studentPhone,
        studentPhone,
        delivery_location: deliveryLocation,
        deliveryLocation,
        restaurant_id: restaurantId,
        restaurantId,
        restaurant_name: restaurantName,
        restaurantName,
        items,
        total_amount: totalAmount,
        totalAmount,
        status: 'CONFIRMED',
        payment_method: paymentMethod,
        created_at: nowIso,
        createdAt: nowIso
      };

      console.log(`[Neon DB] Student Order Placed: #${orderId} by ${studentName} (₹${totalAmount})`);
      return res.status(201).json(newOrder);
    } catch (err) {
      console.error('[Student Orders POST Error]:', err.message);
      return res.status(500).json({ error: 'Failed to create order: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
