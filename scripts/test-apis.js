import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_3O6tHydAMuSg@ep-soft-flower-a5yk954q-pooler.us-east-2.aws.neon.tech/Mutebites?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

async function runTests() {
  console.log('--- STARTING VERIFICATION TESTS ---');

  // Test 1: Query delivery partners
  try {
    const partners = await sql`SELECT * FROM delivery_partners WHERE is_active = true ORDER BY name ASC;`;
    console.log(`✅ Test 1 PASS: Retrieved ${partners.length} active delivery partners from Neon DB.`);
    partners.forEach(p => console.log(`   - ${p.name} (+91 ${p.phone}) PIN: ${p.pin} [Fleet: ${p.restaurant_id || 'all'}]`));
  } catch (err) {
    console.error('❌ Test 1 FAIL: delivery_partners query failed:', err.message);
  }

  // Test 2: Create a test delivery partner
  const testPartnerId = 'test_dp_' + Date.now();
  try {
    await sql`
      INSERT INTO delivery_partners (id, name, phone, pin, restaurant_id, is_active, total_deliveries, created_at, updated_at)
      VALUES (${testPartnerId}, 'Test Rider AP', '9876543210', '4321', 'all', true, 0, NOW(), NOW());
    `;
    const check = await sql`SELECT * FROM delivery_partners WHERE id = ${testPartnerId};`;
    if (check.length > 0) {
      console.log('✅ Test 2 PASS: Successfully created and verified test delivery partner in Neon DB.');
    }
    // Clean up test partner
    await sql`DELETE FROM delivery_partners WHERE id = ${testPartnerId};`;
    console.log('✅ Test 2 CLEANUP: Removed temporary test delivery partner.');
  } catch (err) {
    console.error('❌ Test 2 FAIL: Create delivery partner failed:', err.message);
  }

  // Test 3: Check Menu Items format
  try {
    const dishes = await sql`SELECT id, name, price, restaurant_name, is_available FROM menu_items LIMIT 5;`;
    console.log(`✅ Test 3 PASS: Retrieved ${dishes.length} menu items from Neon DB.`);
    dishes.forEach(d => console.log(`   - ${d.name} (₹${d.price}) from ${d.restaurant_name} [Available: ${d.is_available}]`));
  } catch (err) {
    console.error('❌ Test 3 FAIL: Menu query failed:', err.message);
  }

  // Test 4: Check Students format
  try {
    const students = await sql`SELECT id, name, email, phone, total_orders FROM students LIMIT 5;`;
    console.log(`✅ Test 4 PASS: Retrieved ${students.length} student records from Neon DB.`);
    students.forEach(s => console.log(`   - ${s.name} (${s.email}) Total Orders: ${s.total_orders}`));
  } catch (err) {
    console.error('❌ Test 4 FAIL: Students query failed:', err.message);
  }

  // Test 5: Verify Orders data fields (snake_case vs camelCase)
  try {
    const orders = await sql`SELECT id, student_name, student_phone, restaurant_name, total_amount, status FROM orders ORDER BY created_at DESC LIMIT 3;`;
    console.log(`✅ Test 5 PASS: Verified ${orders.length} orders in Neon DB.`);
    orders.forEach(o => console.log(`   - Order #${o.id}: ${o.student_name} (${o.student_phone}) ₹${o.total_amount} [${o.status}]`));
  } catch (err) {
    console.error('❌ Test 5 FAIL: Orders query failed:', err.message);
  }

  console.log('--- ALL VERIFICATION TESTS COMPLETED ---');
}

runTests();
