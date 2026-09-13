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

  // DELETE /api/orders or POST /api/orders/delete
  const isDeleteRequest = req.method === 'DELETE' || 
    (req.method === 'POST' && (
      req.url.includes('delete') || 
      req.body?.action === 'delete' || 
      (req.body?.orderId && !req.body?.items)
    ));

  if (isDeleteRequest) {
    const orderId = req.query.id || req.query.orderId || req.body?.orderId || req.body?.id;
    if (orderId === 'all' || req.query.all === 'true') {
      try {
        await sql`DELETE FROM order_items;`;
        await sql`DELETE FROM orders;`;
        return res.status(200).json({ success: true, message: 'All orders permanently deleted.' });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    try {
      await sql`DELETE FROM order_items WHERE order_id = ${orderId};`;
      await sql`DELETE FROM orders WHERE id = ${orderId} OR id LIKE ${orderId + '%'};`;
      return res.status(200).json({ success: true, message: `Order #${orderId} permanently deleted.` });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // PATCH /api/orders (Status update)
  const isStatusUpdate = req.method === 'PATCH' || 
    (req.method === 'POST' && (
      req.url.includes('status') || 
      req.body?.action === 'status' || 
      (req.body?.status && !req.body?.items)
    ));

  if (isStatusUpdate) {
    const orderId = req.params?.id || req.query.id || req.query.orderId || req.body?.orderId || req.body?.id;
    const rawStatus = (req.body?.status || '').toUpperCase().trim();
    const status = rawStatus === 'DELIVERED' ? 'COMPLETED' : rawStatus;

    if (!orderId || !status) {
      return res.status(400).json({ success: false, error: 'Order ID and status are required' });
    }

    try {
      let result;
      if (status === 'COMPLETED') {
        result = await sql`
          UPDATE orders 
          SET status = ${status}, completed_at = NOW(), updated_at = NOW() 
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'}
          RETURNING *;
        `;
      } else if (status === 'CANCELLED') {
        result = await sql`
          UPDATE orders 
          SET status = ${status}, cancelled_at = NOW(), updated_at = NOW() 
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'}
          RETURNING *;
        `;
      } else {
        result = await sql`
          UPDATE orders 
          SET status = ${status}, updated_at = NOW() 
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'}
          RETURNING *;
        `;
      }
      if (result && result.length > 0) {
        return res.status(200).json({ success: true, order: result[0] });
      }
      return res.status(404).json({ success: false, error: 'Order not found' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/orders
  if (req.method === 'GET') {
    try {
      const orderId = req.query.id || req.query.orderId;
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

      const studentEmail = req.query.studentEmail || req.query.email || req.query.student_email;
      const restaurantId = req.query.restaurantId || req.query.restaurant_id || req.query.restaurant;
      let rows = [];

      if (studentEmail && restaurantId && restaurantId !== 'all') {
        const cleanEmail = studentEmail.trim().toLowerCase();
        rows = await sql`
          SELECT * FROM orders 
          WHERE LOWER(student_email) = ${cleanEmail} AND restaurant_id = ${restaurantId}
          ORDER BY created_at DESC;
        `;
      } else if (studentEmail) {
        const cleanEmail = studentEmail.trim().toLowerCase();
        rows = await sql`
          SELECT * FROM orders 
          WHERE LOWER(student_email) = ${cleanEmail} 
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
        const deliveryLocation = r.delivery_location || 'SRM University - Gate 3';
        const restaurantName = r.restaurant_name || 'Campus Kitchen';
        const restaurantIdVal = r.restaurant_id || 'local-home-kitchen';
        const partnerName = r.delivery_partner_name || null;
        const partnerPhone = r.delivery_partner_phone || null;
        const partnerId = r.delivery_partner_id || null;

        return {
          id: r.id,
          // Snake case keys
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

          // Camel case keys
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
      console.error('[Student Orders GET Error]:', err.message);
      return res.status(500).json({ error: 'Failed to fetch orders: ' + err.message });
    }
  }

  // POST /api/orders/status or query action=status
  if (req.method === 'POST' && (req.query.action === 'status' || (req.body && req.body.orderId && req.body.status))) {
    try {
      const { orderId, status } = req.body;
      const cleanStatus = (status === 'COMPLETED' || status === 'DELIVERED') ? 'COMPLETED' : (status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED');
      if (cleanStatus === 'COMPLETED') {
        await sql`
          UPDATE orders
          SET status = ${cleanStatus}, completed_at = NOW(), updated_at = NOW()
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'};
        `;
      } else if (cleanStatus === 'CANCELLED') {
        await sql`
          UPDATE orders
          SET status = ${cleanStatus}, cancelled_at = NOW(), updated_at = NOW()
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'};
        `;
      } else {
        await sql`
          UPDATE orders
          SET status = ${cleanStatus}, updated_at = NOW()
          WHERE id = ${orderId} OR id LIKE ${orderId + '%'};
        `;
      }
      return res.status(200).json({ success: true, orderId, status: cleanStatus });
    } catch (err) {
      console.error('[Orders Status Update Error]:', err.message);
      return res.status(500).json({ error: 'Failed to update order status: ' + err.message });
    }
  }

  // POST /api/orders/delete or query action=delete
  if (req.method === 'POST' && (req.query.action === 'delete' || (req.body && req.body.orderId && !req.body.items && !req.body.student_name && !req.body.studentName))) {
    try {
      const { orderId } = req.body;
      await sql`
        DELETE FROM orders
        WHERE id = ${orderId} OR id LIKE ${orderId + '%'};
      `;
      return res.status(200).json({ success: true, deletedOrderId: orderId });
    } catch (err) {
      console.error('[Orders Delete Error]:', err.message);
      return res.status(500).json({ error: 'Failed to delete order: ' + err.message });
    }
  }

  // POST /api/orders (Create Order)
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const studentName = body.student_name || body.studentName || 'Student';
      const studentPhone = body.student_phone || body.studentPhone || '';
      const studentEmail = (body.student_email || body.studentEmail || '').trim().toLowerCase();
      const deliveryLocation = body.delivery_location || body.deliveryLocation || 'SRM University - Gate 3';
      const restaurantId = body.restaurant_id || body.restaurantId || 'local-home-kitchen';
      const restaurantName = body.restaurant_name || body.restaurantName || 'Campus Kitchen';
      const totalAmount = Number(body.total_amount ?? body.totalAmount) || 0;
      const items = Array.isArray(body.items) ? body.items : [];
      const paymentMethod = body.payment_method || body.paymentMethod || 'cod';
      const instructions = body.instructions || null;

      if (!items.length || totalAmount <= 0) {
        return res.status(400).json({ error: 'Order must contain items and a valid total amount.' });
      }

      const orderId = body.id || ('CB-' + Math.floor(100000 + Math.random() * 900000));
      const itemsJson = JSON.stringify(items);
      const nowIso = new Date().toISOString();

      await sql`
        INSERT INTO orders (
          id, student_name, student_email, student_phone,
          delivery_location, restaurant_id, restaurant_name,
          items, total_amount, status, payment_method, instructions,
          created_at, updated_at
        ) VALUES (
          ${orderId}, ${studentName}, ${studentEmail}, ${studentPhone || '9989955833'},
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
