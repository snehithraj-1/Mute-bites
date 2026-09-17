import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:Mutebites%40135@db.pxtizpwijvjzsmripmxy.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const sql = async (strings, ...values) => {
  let query = '';
  for (let i = 0; i < strings.length; i++) {
    query += strings[i];
    if (i < values.length) {
      query += '$' + (i + 1);
    }
  }
  const res = await pool.query(query, values);
  return res.rows;
};

async function test() {
  const orderId = 'TEST-' + Date.now();
  const items = [{ name: 'Test Burger', qty: 1, price: 120 }];
  const itemsJson = JSON.stringify(items);

  await sql`
    INSERT INTO orders (
      id, student_name, student_email, student_phone,
      delivery_location, restaurant_id, restaurant_name,
      items, total_amount, status, payment_method, instructions,
      created_at, updated_at
    ) VALUES (
      ${orderId}, 'Test Student', 'test@vitap.ac.in', '9876543210',
      'Vit-ap Campus', 'bheemasena-restaurant', 'Bheemasena Restaurant',
      ${itemsJson}::jsonb, 120, 'CONFIRMED', 'cod', null,
      NOW(), NOW()
    );
  `;
  console.log('Inserted order:', orderId);

  const rows = await sql`SELECT * FROM orders WHERE id = ${orderId};`;
  console.log('Read order:', rows[0].id, rows[0].status, 'items:', typeof rows[0].items, rows[0].items);

  // Test status update to PREPARING, READY, COMPLETED
  await sql`
    UPDATE orders 
    SET status = 'PREPARING', updated_at = NOW() 
    WHERE id = ${orderId};
  `;
  let r = await sql`SELECT id, status FROM orders WHERE id = ${orderId};`;
  console.log('Status updated to PREPARING:', r[0].status);

  await sql`
    UPDATE orders 
    SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() 
    WHERE id = ${orderId};
  `;
  r = await sql`SELECT id, status, completed_at FROM orders WHERE id = ${orderId};`;
  console.log('Status updated to COMPLETED:', r[0].status, 'at:', r[0].completed_at);

  // Clean up
  await sql`DELETE FROM orders WHERE id = ${orderId};`;
  console.log('Cleaned up test order.');
  await pool.end();
}

test().catch(e => { console.error('Error:', e); process.exit(1); });
