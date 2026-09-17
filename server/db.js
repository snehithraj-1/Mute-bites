import { neon } from '@neondatabase/serverless';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getVerifiedItemPrice } from './menuCatalog.js';

const { Pool } = pg;

// Prevent Node TLS certificate chain verification rejection on cloud serverless runtimes
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export function createUniversalSql(url) {
  if (!url) return null;
  const isSupabaseOrPg = url.includes('supabase.co') || !url.includes('neon.tech');
  if (isSupabaseOrPg) {
    let pool;
    try {
      const parsed = new URL(url);
      pool = new Pool({
        host: parsed.hostname,
        port: parseInt(parsed.port || '5432', 10),
        user: decodeURIComponent(parsed.username || 'postgres'),
        password: decodeURIComponent(parsed.password || ''),
        database: decodeURIComponent(parsed.pathname.replace(/^\//, '') || 'postgres'),
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });
    } catch (parseErr) {
      pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
      });
    }
    const sqlFunc = async (strings, ...values) => {
      if (Array.isArray(strings)) {
        let query = '';
        for (let i = 0; i < strings.length; i++) {
          query += strings[i];
          if (i < values.length) {
            query += '$' + (i + 1);
          }
        }
        const res = await pool.query(query, values);
        return res.rows;
      }
      const res = await pool.query(strings, values[0]);
      return res.rows;
    };
    sqlFunc.query = async (text, params) => {
      const res = await pool.query(text, params);
      return res.rows;
    };
    return sqlFunc;
  }
  return neon(url);
}

// Resolve database URL from process.env or .env file with sanitization
export function getDatabaseUrl() {
  let url = '';

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
      if (match && match[1]) url = match[1].trim();
    }
  } catch (e) {
    // Ignore and fallback
  }

  if (!url) {
    url = process.env.DATABASE_URL 
       || process.env.POSTGRES_URL 
       || process.env.VITE_DATABASE_URL 
       || process.env.DATABASE_PUBLIC_URL 
       || 'postgresql://postgres:Mutebites%40123@db.wymxfaheyhvcqyahludl.supabase.co:5432/postgres';
  }

  if (url) {
    url = url.trim();
    // Strip accidental "DATABASE_URL=" prefix if pasted into Vercel value field
    if (url.startsWith('DATABASE_URL=')) {
      url = url.replace(/^DATABASE_URL=/, '').trim();
    }
    // Strip accidental surrounding single or double quotes
    if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
      url = url.slice(1, -1).trim();
    }
  }

  if (url && url.includes('neon.tech')) {
    url = 'postgresql://postgres:Mutebites%40123@db.wymxfaheyhvcqyahludl.supabase.co:5432/postgres';
  }

  return url;
}

const DATABASE_URL = getDatabaseUrl();

if (!DATABASE_URL) {
  console.warn('[Server DB] WARNING: DATABASE_URL is not set in environment variables!');
}

export const sql = createUniversalSql(DATABASE_URL);

// Health check function for /api/health diagnostic
export async function checkDbHealth() {
  const url = getDatabaseUrl();
  if (!url) {
    return {
      ok: false,
      error: 'DATABASE_URL is missing in environment variables. Add it in Vercel Settings -> Environment Variables.'
    };
  }

  let sanitized = {};
  try {
    const parsed = new URL(url);
    sanitized = {
      user: parsed.username,
      host: parsed.hostname,
      database: parsed.pathname.replace(/^\//, ''),
      hasPassword: Boolean(parsed.password),
      passwordLength: parsed.password ? parsed.password.length : 0
    };
  } catch (e) {
    sanitized = { formatError: 'Invalid URL format' };
  }

  try {
    const rows = await sql`SELECT 1 as connected, NOW() as server_time;`;
    return {
      ok: true,
      message: 'Neon PostgreSQL connected successfully! 🎉',
      serverTime: rows[0]?.server_time,
      info: sanitized
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      info: sanitized,
      diagnosis: err.message.includes('password authentication failed')
        ? 'Password mismatch! The password configured in Vercel Environment Variables does not match the active password in your Neon Console. Please copy the fresh connection string from Neon Console (https://console.neon.tech), update DATABASE_URL in Vercel, and REDEPLOY.'
        : 'Database connection failed. Please verify your connection string in Neon Console.'
    };
  }
}

// Phase 5 State Machine
export const ALLOWED_TRANSITIONS = {
  'PENDING_CONFIRMATION': ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  'CONFIRMED': ['DELIVERED', 'PREPARING', 'CANCELLED'],
  'PREPARING': ['DELIVERED', 'READY', 'CANCELLED'],
  'READY': ['DELIVERED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  'PICKED_UP': ['DELIVERED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  'OUT_FOR_DELIVERY': ['DELIVERED', 'CANCELLED'],
  'DELIVERED': ['CONFIRMED'],
  'CANCELLED': [],
  'EXPIRED': []
};

// Phase 8: Ensure order_status_history table exists in Neon
let isHistoryTableReady = false;
export async function ensureStatusHistoryTable() {
  if (isHistoryTableReady) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        changed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
    `;
    isHistoryTableReady = true;
  } catch (err) {
    console.warn('[Server DB] Note on ensureStatusHistoryTable:', err.message);
  }
}

export async function recordStatusHistoryInDb(orderId, status, timestamp = new Date().toISOString()) {
  try {
    await ensureStatusHistoryTable();
    await sql`
      INSERT INTO order_status_history (order_id, status, changed_at)
      VALUES (${orderId}, ${status}, ${timestamp});
    `;
  } catch (err) {
    console.error(`[Server DB] Failed to record status history for ${orderId} (${status}):`, err);
  }
}

// Phase 9: Delivery Partner & Live Location Tracking Tables in Neon
let isDeliveryTablesReady = false;
export async function ensureDeliveryTables() {
  if (isDeliveryTablesReady) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS delivery_partners (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50),
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        is_available BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_partner_id VARCHAR(50);
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS delivery_locations (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        delivery_partner_id VARCHAR(50) NOT NULL,
        latitude NUMERIC(10, 7) NOT NULL,
        longitude NUMERIC(10, 7) NOT NULL,
        accuracy NUMERIC(10, 2),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_delivery_locations_order_id ON delivery_locations(order_id);
    `;

    // Seed default partners if none exist
    const countRows = await sql`SELECT COUNT(*)::int AS count FROM delivery_partners;`;
    if (countRows[0].count === 0) {
      await sql`
        INSERT INTO delivery_partners (id, user_id, name, phone, is_available, is_active)
        VALUES 
          ('DP-101', 'USR-DP-101', 'Ramesh Kumar', '+91 7842960252', true, true),
          ('DP-102', 'USR-DP-102', 'Suresh Reddy', '+91 9398414231', true, true),
          ('DP-103', 'USR-DP-103', 'Anita Patel', '+91 9876543210', true, true);
      `;
    }

    isDeliveryTablesReady = true;
  } catch (err) {
    console.warn('[Server DB] Note on ensureDeliveryTables:', err.message);
  }
}

/**
 * Phase 3: Create Order in Neon Database
 * Atomic transaction inserting into orders and order_items
 */
export async function createOrderInDb({
  studentName,
  studentPhone,
  studentId,
  restaurantId,
  restaurantName,
  deliveryLocation,
  instructions,
  items
}) {
  if (!studentName || !studentPhone || !restaurantId || !Array.isArray(items) || items.length === 0) {
    throw new Error('Invalid order payload: Missing student details, restaurant or items.');
  }

  // Phase 5 & 6 Server-Side Guard: Validate master switch and restaurant status in database
  const settingsRows = await sql`SELECT setting_value FROM system_settings WHERE setting_key = 'overall_ordering';`;
  if (settingsRows.length > 0 && settingsRows[0].setting_value === 'false') {
    throw new Error('Ordering is currently unavailable.');
  }

  const restRows = await sql`SELECT status FROM restaurant_statuses WHERE restaurant_id = ${restaurantId};`;
  if (restRows.length > 0 && restRows[0].status === 'CLOSED') {
    throw new Error('This restaurant is currently closed.');
  }

  // 1. Validate prices from server-side menu catalog and calculate verified totals
  let verifiedSubtotal = 0;
  const verifiedItems = items.map((item) => {
    const qty = parseInt(item.qty || item.quantity || 1, 10);
    if (qty <= 0) throw new Error(`Invalid item quantity for ${item.name || 'item'}`);

    const unitPrice = getVerifiedItemPrice(item);
    const itemTotal = unitPrice * qty;
    verifiedSubtotal += itemTotal;

    return {
      id: item.id || null,
      name: item.name || item.item_name || 'Dish',
      quantity: qty,
      unit_price: unitPrice,
      total_price: itemTotal
    };
  });

  const platformFee = 0;
  const deliveryFee = 0;
  const verifiedTotal = verifiedSubtotal + platformFee + deliveryFee;

  // 2. Generate unique Order ID
  const prefix = restaurantId === 'bheemasena-restaurant' ? 'BHM' : 'MB';
  const orderId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 3. Set Confirmation Expiry = NOW() + 30 seconds
  const now = new Date();
  const confirmationExpiresAt = new Date(now.getTime() + 30 * 1000);

  // 4. Build Atomic Transaction Queries
  const insertOrderQuery = sql`
    INSERT INTO orders (
      id,
      student_name,
      student_phone,
      student_id,
      restaurant_id,
      restaurant_name,
      delivery_location,
      instructions,
      total_amount,
      status,
      items,
      confirmation_expires_at,
      created_at,
      updated_at
    ) VALUES (
      ${orderId},
      ${studentName.trim()},
      ${studentPhone.trim()},
      ${studentId ? studentId.trim() : null},
      ${restaurantId},
      ${restaurantName || 'Bheemasena Restaurant'},
      ${deliveryLocation || 'Hostel Delivery'},
      ${instructions || ''},
      ${verifiedTotal},
      'PENDING_CONFIRMATION',
      ${JSON.stringify(verifiedItems)},
      ${confirmationExpiresAt.toISOString()},
      ${now.toISOString()},
      ${now.toISOString()}
    ) RETURNING *;
  `;

  const insertItemQueries = verifiedItems.map((item) => {
    return sql`
      INSERT INTO order_items (
        order_id,
        item_name,
        quantity,
        unit_price,
        total_price,
        created_at
      ) VALUES (
        ${orderId},
        ${item.name},
        ${item.quantity},
        ${item.unit_price},
        ${item.total_price},
        ${now.toISOString()}
      );
    `;
  });

  // Execute atomically
  await ensureStatusHistoryTable();
  const insertHistoryQuery = sql`
    INSERT INTO order_status_history (
      order_id,
      status,
      changed_at
    ) VALUES (
      ${orderId},
      'PENDING_CONFIRMATION',
      ${now.toISOString()}
    );
  `;

  await sql.transaction([insertOrderQuery, ...insertItemQueries, insertHistoryQuery]);

  return {
    id: orderId,
    studentName: studentName.trim(),
    studentPhone: studentPhone.trim(),
    studentId: studentId || null,
    restaurantId,
    restaurantName: restaurantName || 'Bheemasena Restaurant',
    deliveryLocation: deliveryLocation || 'Hostel Delivery',
    instructions: instructions || '',
    totalAmount: verifiedTotal,
    status: 'PENDING_CONFIRMATION',
    items: verifiedItems,
    confirmationExpiresAt: confirmationExpiresAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    statusHistory: [
      { id: 1, orderId, status: 'PENDING_CONFIRMATION', changedAt: now.toISOString() }
    ]
  };
}

/**
 * Phase 4: Get Order by ID with order_items and automatic expiry check
 */
export async function getOrderByIdFromDb(orderId) {
  const rows = await sql`
    SELECT 
      id,
      student_name AS "studentName",
      student_phone AS "studentPhone",
      student_id AS "studentId",
      restaurant_id AS "restaurantId",
      restaurant_name AS "restaurantName",
      delivery_location AS "deliveryLocation",
      instructions,
      total_amount::float AS "totalAmount",
      status,
      items,
      delivery_partner_id AS "deliveryPartnerId",
      delivery_partner_id AS "delivery_partner_id",
      cancelled_reason AS "cancelledReason",
      confirmation_expires_at AS "confirmationExpiresAt",
      created_at AS "createdAt",
      confirmed_at AS "confirmedAt",
      cancelled_at AS "cancelledAt",
      updated_at AS "updatedAt"
    FROM orders
    WHERE id = ${orderId};
  `;

  if (rows.length === 0) return null;
  const order = rows[0];

  // Auto-expire check: If PENDING_CONFIRMATION and current time > confirmationExpiresAt
  if (order.status === 'PENDING_CONFIRMATION' && order.confirmationExpiresAt) {
    const expiryTime = new Date(order.confirmationExpiresAt).getTime();
    if (Date.now() > expiryTime) {
      await sql`
        UPDATE orders
        SET 
          status = 'EXPIRED',
          cancelled_reason = 'Confirmation time expired (30 seconds)',
          cancelled_at = NOW(),
          updated_at = NOW()
        WHERE id = ${orderId};
      `;
      order.status = 'EXPIRED';
      order.cancelledReason = 'Confirmation time expired (30 seconds)';
      await recordStatusHistoryInDb(orderId, 'EXPIRED');
    }
  }

  // Fetch relational order items
  const items = await sql`
    SELECT 
      id,
      order_id AS "orderId",
      item_name AS "name",
      quantity,
      unit_price::float AS "unitPrice",
      total_price::float AS "totalPrice",
      created_at AS "createdAt"
    FROM order_items
    WHERE order_id = ${orderId}
    ORDER BY id ASC;
  `;

  order.orderItems = items;
  // If items was array of objects, prioritize real order_items
  if (items.length > 0) {
    order.items = items.map(i => ({
      name: i.name,
      qty: i.quantity,
      price: i.unitPrice,
      total: i.totalPrice
    }));
  }

  // Fetch status history
  await ensureStatusHistoryTable();
  const historyRows = await sql`
    SELECT 
      id,
      order_id AS "orderId",
      status,
      changed_at AS "changedAt"
    FROM order_status_history
    WHERE order_id = ${orderId}
    ORDER BY changed_at ASC, id ASC;
  `;

  let statusHistory = historyRows.map(h => ({
    id: h.id,
    orderId: h.orderId,
    status: h.status,
    changedAt: h.changedAt
  }));

  // Resilient fallback for orders created prior to order_status_history table
  if (statusHistory.length === 0) {
    statusHistory = [
      { id: 1, orderId, status: 'PENDING_CONFIRMATION', changedAt: order.createdAt }
    ];
    if (order.confirmedAt) {
      statusHistory.push({ id: 2, orderId, status: 'CONFIRMED', changedAt: order.confirmedAt });
    }
    if (order.status !== 'PENDING_CONFIRMATION' && order.status !== 'CONFIRMED') {
      statusHistory.push({ id: 3, orderId, status: order.status, changedAt: order.updatedAt || order.cancelledAt || order.createdAt });
    }
  }

  order.statusHistory = statusHistory;

  // Hydrate delivery partner details if assigned
  if (order.deliveryPartnerId) {
    await ensureDeliveryTables();
    const partnerRows = await sql`
      SELECT id, name, phone FROM delivery_partners WHERE id = ${order.deliveryPartnerId};
    `;
    if (partnerRows.length > 0) {
      order.deliveryPartner = partnerRows[0];
      order.deliveryPartnerName = partnerRows[0].name;
      order.deliveryPartnerPhone = partnerRows[0].phone;
    }
  }

  return order;
}

/**
 * Phase 4: Confirm Order
 * Prevents confirming expired orders or invalid status transitions
 */
export async function confirmOrderInDb(orderId) {
  const order = await getOrderByIdFromDb(orderId);
  if (!order) {
    return { error: 'Order not found', code: 404 };
  }

  // Must be in PENDING_CONFIRMATION
  if (order.status !== 'PENDING_CONFIRMATION') {
    return { 
      error: `Order cannot be confirmed because status is ${order.status}`, 
      code: 400,
      order 
    };
  }

  // Strict 30s expiry verification
  const expiryTime = new Date(order.confirmationExpiresAt).getTime();
  if (Date.now() > expiryTime) {
    await sql`
      UPDATE orders
      SET 
        status = 'EXPIRED',
        cancelled_reason = 'Confirmation window expired before confirmation',
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE id = ${orderId};
    `;
    order.status = 'EXPIRED';
    return { 
      error: 'Order confirmation window (30 seconds) has expired.', 
      code: 410,
      order 
    };
  }

  // Update to CONFIRMED
  const now = new Date();
  await sql`
    UPDATE orders
    SET 
      status = 'CONFIRMED',
      confirmed_at = ${now.toISOString()},
      updated_at = ${now.toISOString()}
    WHERE id = ${orderId};
  `;

  order.status = 'CONFIRMED';
  order.confirmedAt = now.toISOString();
  order.updatedAt = now.toISOString();

  await recordStatusHistoryInDb(orderId, 'CONFIRMED', now.toISOString());

  return { success: true, order };
}

/**
 * Phase 4 & 5: Cancel Order
 */
export async function cancelOrderInDb(orderId, reason = 'Cancelled by Student') {
  const order = await getOrderByIdFromDb(orderId);
  if (!order) {
    return { error: 'Order not found', code: 404 };
  }

  if (['DELIVERED', 'CANCELLED', 'EXPIRED'].includes(order.status)) {
    return { 
      error: `Order cannot be cancelled because it is already ${order.status}`, 
      code: 400,
      order 
    };
  }

  const now = new Date();
  await sql`
    UPDATE orders
    SET 
      status = 'CANCELLED',
      cancelled_reason = ${reason},
      cancelled_at = ${now.toISOString()},
      updated_at = ${now.toISOString()}
    WHERE id = ${orderId};
  `;

  order.status = 'CANCELLED';
  order.cancelledReason = reason;
  order.cancelledAt = now.toISOString();
  order.updatedAt = now.toISOString();

  await recordStatusHistoryInDb(orderId, 'CANCELLED', now.toISOString());

  return { success: true, order };
}

/**
 * Phase 5: Update Order Status with transition validation
 */
export async function updateOrderStatusInDb(orderId, nextStatus, reason = null) {
  const order = await getOrderByIdFromDb(orderId);
  if (!order) {
    return { error: 'Order not found', code: 404 };
  }

  const currentStatus = order.status;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    return {
      error: `Invalid status transition: Cannot move order from ${currentStatus} to ${nextStatus}. Allowed: ${allowed.join(', ') || 'None (Terminal state)'}`,
      code: 400,
      order
    };
  }

  const now = new Date();
  await sql`
    UPDATE orders
    SET 
      status = ${nextStatus},
      cancelled_reason = ${reason || order.cancelledReason},
      updated_at = ${now.toISOString()}
    WHERE id = ${orderId};
  `;

  order.status = nextStatus;
  order.updatedAt = now.toISOString();

  await recordStatusHistoryInDb(orderId, nextStatus, now.toISOString());

  return { success: true, order };
}

/**
 * Phase 6: Get Orders for a specific student
 */
export async function getStudentOrdersFromDb(studentIdentifier) {
  const clean = studentIdentifier.trim();
  const rows = await sql`
    SELECT 
      id,
      student_name AS "studentName",
      student_phone AS "studentPhone",
      student_id AS "studentId",
      restaurant_id AS "restaurantId",
      restaurant_name AS "restaurantName",
      delivery_location AS "deliveryLocation",
      instructions,
      total_amount::float AS "totalAmount",
      status,
      items,
      cancelled_reason AS "cancelledReason",
      confirmation_expires_at AS "confirmationExpiresAt",
      created_at AS "createdAt",
      confirmed_at AS "confirmedAt",
      cancelled_at AS "cancelledAt",
      updated_at AS "updatedAt"
    FROM orders
    WHERE student_phone = ${clean} OR student_id = ${clean}
    ORDER BY created_at DESC;
  `;

  return rows;
}

/**
 * Phase 6: Get all orders for Admin
 */
export async function getAllOrdersFromDb() {
  const rows = await sql`
    SELECT 
      id,
      student_name AS "studentName",
      student_name AS "student_name",
      student_phone AS "studentPhone",
      student_phone AS "student_phone",
      student_id AS "studentId",
      student_id AS "student_id",
      restaurant_id AS "restaurantId",
      restaurant_id AS "restaurant_id",
      restaurant_name AS "restaurantName",
      restaurant_name AS "restaurant_name",
      delivery_location AS "deliveryLocation",
      instructions,
      total_amount::float AS "totalAmount",
      total_amount::float AS "total_amount",
      status,
      items,
      cancelled_reason AS "cancelledReason",
      confirmation_expires_at AS "confirmationExpiresAt",
      created_at AS "createdAt",
      created_at AS "created_at",
      confirmed_at AS "confirmedAt",
      cancelled_at AS "cancelledAt",
      updated_at AS "updatedAt"
    FROM orders
    ORDER BY created_at DESC;
  `;

  // Fetch relational order items
  const allOrderItems = await sql`
    SELECT 
      id,
      order_id AS "orderId",
      item_name AS "name",
      quantity,
      unit_price::float AS "unitPrice",
      total_price::float AS "totalPrice",
      created_at AS "createdAt"
    FROM order_items
    ORDER BY id ASC;
  `;

  const itemsByOrder = {};
  for (const item of allOrderItems) {
    if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
    itemsByOrder[item.orderId].push(item);
  }

  // Check and update any expired pending orders & attach relational order_items
  const nowTime = Date.now();
  for (const o of rows) {
    if (o.status === 'PENDING_CONFIRMATION' && o.confirmationExpiresAt) {
      if (nowTime > new Date(o.confirmationExpiresAt).getTime()) {
        o.status = 'EXPIRED';
        o.cancelledReason = 'Confirmation time expired (30 seconds)';
      }
    }

    const relationalItems = itemsByOrder[o.id] || [];
    if (relationalItems.length > 0) {
      o.orderItems = relationalItems;
      o.orderedItems = relationalItems;
      o.items = relationalItems.map(i => ({
        name: i.name,
        qty: i.quantity,
        quantity: i.quantity,
        price: i.unitPrice,
        unit_price: i.unitPrice,
        total: i.totalPrice,
        total_price: i.totalPrice
      }));
      o.quantity = relationalItems.reduce((sum, i) => sum + i.quantity, 0);
    } else if (Array.isArray(o.items)) {
      o.orderedItems = o.items;
      o.quantity = o.items.reduce((sum, i) => sum + (i.qty || i.quantity || 1), 0);
    } else {
      o.orderedItems = [];
      o.quantity = 1;
    }
  }

  return rows;
}

/**
 * Delete order from Neon with cascading deletion of order_items
 */
export async function deleteOrderFromDb(orderId) {
  await ensureStatusHistoryTable();
  await ensureDeliveryTables();
  const deleteLocations = sql`DELETE FROM delivery_locations WHERE order_id = ${orderId};`;
  const deleteHistory = sql`DELETE FROM order_status_history WHERE order_id = ${orderId};`;
  const deleteItems = sql`DELETE FROM order_items WHERE order_id = ${orderId};`;
  const deleteOrder = sql`DELETE FROM orders WHERE id = ${orderId};`;
  await sql.transaction([deleteLocations, deleteHistory, deleteItems, deleteOrder]);
  return { success: true, id: orderId };
}

export async function getOverallOrderingSettingFromDb() {
  const rows = await sql`SELECT setting_value FROM system_settings WHERE setting_key = 'overall_ordering';`;
  if (rows.length === 0) return true;
  return rows[0].setting_value !== 'false';
}

export async function setOverallOrderingSettingInDb(enabled) {
  const val = enabled ? 'true' : 'false';
  await sql`
    INSERT INTO system_settings (setting_key, setting_value, updated_at)
    VALUES ('overall_ordering', ${val}, NOW())
    ON CONFLICT (setting_key)
    DO UPDATE SET setting_value = ${val}, updated_at = NOW();
  `;
  return { success: true, overallOrdering: Boolean(enabled) };
}

/**
 * System Settings & Restaurant Statuses
 */
export async function getSystemSettingsFromDb() {
  const rows = await sql`SELECT setting_key, setting_value FROM system_settings;`;
  const settings = { overall_ordering: true };
  rows.forEach(r => {
    if (r.setting_key === 'overall_ordering') {
      settings.overall_ordering = r.setting_value === 'true';
    }
  });
  return settings;
}

export async function updateSystemSettingInDb(key, value) {
  const val = String(value);
  await sql`
    INSERT INTO system_settings (setting_key, setting_value, updated_at)
    VALUES (${key}, ${val}, NOW())
    ON CONFLICT (setting_key)
    DO UPDATE SET setting_value = ${val}, updated_at = NOW();
  `;
  return { success: true, key, value };
}

export async function getRestaurantStatusesFromDb() {
  const rows = await sql`SELECT restaurant_id, status FROM restaurant_statuses;`;
  const statuses = {};
  rows.forEach(r => {
    statuses[r.restaurant_id] = r.status;
  });
  return statuses;
}

export async function updateRestaurantStatusInDb(restaurantId, status) {
  await sql`
    INSERT INTO restaurant_statuses (restaurant_id, status, updated_at)
    VALUES (${restaurantId}, ${status}, NOW())
    ON CONFLICT (restaurant_id)
    DO UPDATE SET status = ${status}, updated_at = NOW();
  `;
  return { success: true, restaurantId, status };
}

// ==========================================
// PHASE 9: DELIVERY PARTNER & LOCATION LOGIC
// ==========================================

export async function getAllDeliveryPartnersFromDb() {
  await ensureDeliveryTables();
  const rows = await sql`
    SELECT 
      id,
      user_id AS "userId",
      name,
      phone,
      is_available AS "isAvailable",
      is_active AS "isActive",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM delivery_partners
    WHERE is_active = true
    ORDER BY name ASC;
  `;
  return rows;
}

export async function getDeliveryPartnerByIdFromDb(partnerId) {
  await ensureDeliveryTables();
  const rows = await sql`
    SELECT 
      id,
      user_id AS "userId",
      name,
      phone,
      is_available AS "isAvailable",
      is_active AS "isActive"
    FROM delivery_partners
    WHERE id = ${partnerId} OR phone = ${partnerId};
  `;
  return rows.length > 0 ? rows[0] : null;
}

export async function assignDeliveryPartnerToOrderInDb(orderId, deliveryPartnerId) {
  await ensureDeliveryTables();
  const order = await getOrderByIdFromDb(orderId);
  if (!order) {
    return { error: 'Order not found', code: 404 };
  }

  // Requirement: Verify the order is READY
  if (order.status !== 'READY') {
    return { 
      error: `Delivery partner can only be assigned when order status is READY. Current status is ${order.status}.`, 
      code: 400 
    };
  }

  const partner = await getDeliveryPartnerByIdFromDb(deliveryPartnerId);
  if (!partner) {
    return { error: 'Delivery partner not found', code: 404 };
  }

  const now = new Date();
  await sql`
    UPDATE orders
    SET 
      delivery_partner_id = ${partner.id},
      updated_at = ${now.toISOString()}
    WHERE id = ${orderId};
  `;

  order.deliveryPartnerId = partner.id;
  order.deliveryPartner = partner;
  order.deliveryPartnerName = partner.name;
  order.deliveryPartnerPhone = partner.phone;
  order.updatedAt = now.toISOString();

  return { success: true, order, partner };
}

export async function getOrdersForDeliveryPartnerFromDb(partnerId) {
  await ensureDeliveryTables();
  const rows = await sql`
    SELECT 
      o.id,
      o.student_name AS "studentName",
      o.student_phone AS "studentPhone",
      o.student_id AS "studentId",
      o.restaurant_id AS "restaurantId",
      o.restaurant_name AS "restaurantName",
      o.delivery_location AS "deliveryLocation",
      o.instructions,
      o.total_amount::float AS "totalAmount",
      o.status,
      o.items,
      o.delivery_partner_id AS "deliveryPartnerId",
      o.created_at AS "createdAt",
      o.updated_at AS "updatedAt"
    FROM orders o
    WHERE o.delivery_partner_id = ${partnerId}
    ORDER BY o.created_at DESC;
  `;

  for (const o of rows) {
    if (Array.isArray(o.items)) {
      o.orderedItems = o.items;
      o.quantity = o.items.reduce((sum, i) => sum + (i.qty || i.quantity || 1), 0);
    }
  }

  return rows;
}

export async function updateDeliveryOrderStatusInDb(orderId, nextStatus, partnerId) {
  await ensureDeliveryTables();
  const order = await getOrderByIdFromDb(orderId);
  if (!order) {
    return { error: 'Order not found', code: 404 };
  }

  // Verify partner is assigned to this order
  if (order.deliveryPartnerId && order.deliveryPartnerId !== partnerId) {
    return { error: 'Unauthorized: You are not assigned to this delivery order', code: 403 };
  }

  // Allowed transitions for delivery partner:
  // READY -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED
  const currentStatus = order.status;
  const valid = (currentStatus === 'READY' && nextStatus === 'PICKED_UP') ||
                (currentStatus === 'PICKED_UP' && nextStatus === 'OUT_FOR_DELIVERY') ||
                (currentStatus === 'OUT_FOR_DELIVERY' && nextStatus === 'DELIVERED');

  if (!valid) {
    return {
      error: `Invalid transition for delivery partner from ${currentStatus} to ${nextStatus}`,
      code: 400
    };
  }

  return await updateOrderStatusInDb(orderId, nextStatus);
}

export async function recordDeliveryLocationInDb({ orderId, deliveryPartnerId, latitude, longitude, accuracy = null }) {
  await ensureDeliveryTables();
  const order = await getOrderByIdFromDb(orderId);
  if (!order) {
    return { error: 'Order not found', code: 404 };
  }

  if (order.deliveryPartnerId && order.deliveryPartnerId !== deliveryPartnerId) {
    return { error: 'Unauthorized: Partner not assigned to order', code: 403 };
  }

  // Location tracking is ONLY recorded for active deliveries
  if (!['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.status)) {
    return { error: `Location cannot be recorded when order status is ${order.status}`, code: 400 };
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const acc = accuracy !== null ? parseFloat(accuracy) : null;

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { error: 'Invalid latitude or longitude values', code: 400 };
  }

  const now = new Date();
  const insertRows = await sql`
    INSERT INTO delivery_locations (
      order_id,
      delivery_partner_id,
      latitude,
      longitude,
      accuracy,
      created_at
    ) VALUES (
      ${order.id},
      ${deliveryPartnerId},
      ${lat},
      ${lng},
      ${acc},
      ${now.toISOString()}
    ) RETURNING id, order_id AS "orderId", latitude::float, longitude::float, accuracy::float, created_at AS "createdAt";
  `;

  return { success: true, location: insertRows[0] };
}

export async function getLatestDeliveryLocationFromDb(orderId) {
  await ensureDeliveryTables();
  const order = await getOrderByIdFromDb(orderId);
  if (!order) {
    return { error: 'Order not found', code: 404 };
  }

  // Privacy & Security requirement:
  // Do not expose a delivery partner's location after delivery is completed.
  // Stop location sharing after DELIVERED.
  if (!['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.status)) {
    return {
      active: false,
      status: order.status,
      message: 'Location tracking is inactive or order has completed delivery.',
      location: null
    };
  }

  const rows = await sql`
    SELECT 
      id,
      order_id AS "orderId",
      delivery_partner_id AS "deliveryPartnerId",
      latitude::float,
      longitude::float,
      accuracy::float,
      created_at AS "timestamp"
    FROM delivery_locations
    WHERE order_id = ${order.id}
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  `;

  if (rows.length === 0) {
    // Return default origin coordinates (Local Home Kitchen, Neerukonda) if partner hasn't pinged yet
    return {
      active: true,
      status: order.status,
      location: {
        latitude: 16.457955,
        longitude: 80.494493,
        accuracy: 6,
        timestamp: new Date().toISOString()
      },
      partner: order.deliveryPartner
    };
  }

  return {
    active: true,
    status: order.status,
    location: rows[0],
    partner: order.deliveryPartner
  };
}
