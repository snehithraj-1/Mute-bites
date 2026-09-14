// Using global Node.js fetch
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// Get DATABASE_URL
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=(.+)/);
const dbUrl = match ? match[1].trim() : '';

const BASE_URL = 'http://localhost:5000';

// Configuration for Stress / Heavy Traffic Simulation
const TOTAL_CONCURRENT_USERS = 50;   // 50 simultaneous users
const TOTAL_ORDERS_TO_PLACE = 100;    // 100 orders placed concurrently
const TOTAL_READ_REQUESTS = 200;      // 200 high-frequency reads (admin polling + student tracking)

console.log('====================================================');
console.log('⚡ VIT : MUTE BITES HEAVY TRAFFIC STRESS & LOAD TEST ⚡');
console.log('====================================================');
console.log(`Target: ${BASE_URL}`);
console.log(`Concurrent Simulated Users: ${TOTAL_CONCURRENT_USERS}`);
console.log(`Total Orders to create:     ${TOTAL_ORDERS_TO_PLACE}`);
console.log(`Total Read requests:        ${TOTAL_READ_REQUESTS}`);
console.log('====================================================\n');

async function testHealth() {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/api/health`);
  const data = await res.json();
  const duration = Date.now() - start;
  return { ok: res.ok, status: res.status, data, duration };
}

// Order generator
function generateSampleOrder(index) {
  const studentNames = [
    'Aarav Sharma', 'Diya Patel', 'Rohan Gupta', 'Sneha Iyer',
    'Vikram Singh', 'Ananya Verma', 'Karan Mehta', 'Pooja Reddy',
    'Rahul Nair', 'Meera Joshi'
  ];
  const hostels = ['Block A', 'Block B', 'Block C', 'Aryabhata', 'Visvesvaraya'];
  const name = studentNames[index % studentNames.length];
  const email = `student_${index}@campus.edu`;
  const hostel = hostels[index % hostels.length];
  const room = `Room ${100 + (index % 400)}`;

  return {
    id: `CB-STRESS-${String(index).padStart(4, '0')}`,
    user_id: `user_stress_${index}`,
    student_name: name,
    student_email: email,
    student_id: `STU-STRESS-${1000 + index}`,
    student_phone: `+91 98000 ${String(10000 + index).slice(-5)}`,
    delivery_location: `${hostel} - ${room}`,
    hostel_block: hostel,
    room_number: room,
    restaurant_id: index % 2 === 0 ? 'local-home-kitchen' : 'campus-delight',
    restaurant_name: index % 2 === 0 ? 'Local Home Kitchen' : 'Campus Delight Kitchen',
    total_amount: 150 + (index % 10) * 25,
    status: 'CONFIRMED',
    instructions: 'Rush order - lunchtime rush test',
    items: [
      { id: 'item-biryani', name: 'Dum Biryani Meal', quantity: 1, price: 180 },
      { id: 'item-drink', name: 'Cold Drink', quantity: 1, price: 40 }
    ]
  };
}

async function placeOrder(order) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    const data = await res.json();
    return { ok: res.ok && data.success, duration: Date.now() - start, error: data.error };
  } catch (err) {
    return { ok: false, duration: Date.now() - start, error: err.message };
  }
}

async function readOrders() {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/orders`);
    const data = await res.json();
    return { ok: res.ok && data.success, duration: Date.now() - start, count: data.orders?.length || 0 };
  } catch (err) {
    return { ok: false, duration: Date.now() - start, error: err.message };
  }
}

async function updateStatus(orderId, newStatus) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    return { ok: res.ok && data.success, duration: Date.now() - start };
  } catch (err) {
    return { ok: false, duration: Date.now() - start, error: err.message };
  }
}

async function updateStudentProfile(student) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student)
    });
    const data = await res.json();
    return { ok: res.ok && data.success, duration: Date.now() - start, error: data.error };
  } catch (err) {
    return { ok: false, duration: Date.now() - start, error: err.message };
  }
}

async function assignPartner(orderId, partner) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/orders/${orderId}/assign-partner`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id: partner.id,
        partner_name: partner.name,
        partner_phone: partner.phone
      })
    });
    const data = await res.json();
    return { ok: res.ok && data.success, duration: Date.now() - start, error: data.error };
  } catch (err) {
    return { ok: false, duration: Date.now() - start, error: err.message };
  }
}

async function toggleRestaurant(restaurantId, isOpen) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/restaurants/${restaurantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_open: isOpen })
    });
    const data = await res.json();
    return { ok: res.ok && data.success, duration: Date.now() - start, error: data.error };
  } catch (err) {
    return { ok: false, duration: Date.now() - start, error: err.message };
  }
}

async function toggleSystemOrdering(enabled) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/settings/ordering`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordering_enabled: enabled })
    });
    const data = await res.json();
    return { ok: res.ok && data.success, duration: Date.now() - start, error: data.error };
  } catch (err) {
    return { ok: false, duration: Date.now() - start, error: err.message };
  }
}

async function runBenchmark() {
  // 1. Initial Health Check
  console.log('🔍 Step 1: Health check & DB verification...');
  const initialHealth = await testHealth();
  console.log(`Backend Status: ${initialHealth.ok ? '🟢 ONLINE' : '🔴 OFFLINE'} (${initialHealth.duration}ms)`);
  console.log(`Neon Database:  ${initialHealth.data?.neon?.status} (${initialHealth.data?.neon?.database})\n`);

  // 2A. Student Profile Edit & Update Concurrency Test
  const TOTAL_PROFILE_UPDATES = 40;
  console.log(`👤 Step 2A: Simulating ${TOTAL_PROFILE_UPDATES} students concurrently editing and updating their profile details in Neon DB...`);
  const profileStart = Date.now();
  const profileLatencies = [];
  let profileSuccess = 0;
  let profileFailed = 0;

  const sampleStudents = Array.from({ length: TOTAL_PROFILE_UPDATES }, (_, i) => ({
    name: `Student Tested ${i + 1}`,
    email: `student_${i + 1}@campus.edu`,
    phone: `98765${String(10000 + i).slice(-5)}`
  }));

  const profileResults = await Promise.all(sampleStudents.map(s => updateStudentProfile(s)));
  profileResults.forEach(r => {
    profileLatencies.push(r.duration);
    if (r.ok) profileSuccess++;
    else profileFailed++;
  });
  const profileTotalTime = Date.now() - profileStart;
  console.log(`Student profile updates: ${profileSuccess}/${TOTAL_PROFILE_UPDATES} succeeded in ${profileTotalTime}ms.\n`);

  // 2B. High-Concurrency Burst Write Test (Simultaneous Orders)
  console.log(`🚀 Step 2B: Firing ${TOTAL_ORDERS_TO_PLACE} simultaneous orders in batches of ${TOTAL_CONCURRENT_USERS}...`);
  const writeLatencies = [];
  let writeSuccess = 0;
  let writeFailed = 0;

  const testStartTime = Date.now();

  // Execute in concurrent chunks
  const orders = Array.from({ length: TOTAL_ORDERS_TO_PLACE }, (_, i) => generateSampleOrder(i + 1));
  for (let i = 0; i < orders.length; i += TOTAL_CONCURRENT_USERS) {
    const chunk = orders.slice(i, i + TOTAL_CONCURRENT_USERS);
    const results = await Promise.all(chunk.map(o => placeOrder(o)));
    results.forEach(r => {
      writeLatencies.push(r.duration);
      if (r.ok) writeSuccess++;
      else {
        writeFailed++;
        if (r.error) console.error('Write error:', r.error);
      }
    });
  }
  const writeTotalTime = Date.now() - testStartTime;

  // 3. High-Concurrency Read & Polling Test (Admin Kitchen polling while students place orders)
  console.log(`\n📡 Step 3: Firing ${TOTAL_READ_REQUESTS} simultaneous order reads/polling...`);
  const readLatencies = [];
  let readSuccess = 0;
  let readFailed = 0;

  const readStartTime = Date.now();
  for (let i = 0; i < TOTAL_READ_REQUESTS; i += TOTAL_CONCURRENT_USERS) {
    const chunk = Array.from({ length: Math.min(TOTAL_CONCURRENT_USERS, TOTAL_READ_REQUESTS - i) }, () => readOrders());
    const results = await Promise.all(chunk);
    results.forEach(r => {
      readLatencies.push(r.duration);
      if (r.ok) readSuccess++;
      else readFailed++;
    });
  }
  const readTotalTime = Date.now() - readStartTime;

  // 4. Kitchen Status Update Burst Test (Admin changing status for 20 orders simultaneously)
  console.log('\n👨‍🍳 Step 4: Simulating Kitchen Admin updating order statuses under load...');
  const sampleOrderIds = orders.slice(0, 20).map(o => o.id);
  const updatePromises = sampleOrderIds.map(id => updateStatus(id, 'PREPARING'));
  const updateResults = await Promise.all(updatePromises);
  const updateSuccess = updateResults.filter(r => r.ok).length;
  console.log(`Kitchen status updates: ${updateSuccess}/${sampleOrderIds.length} succeeded.`);

  // 5. Delivery Partner Assignment Burst Test (Assigning couriers under load)
  console.log('\n🛵 Step 5: Simulating Kitchen Admin assigning delivery partners to orders under load...');
  const partnerList = [
    { id: 'dp-1', name: 'Ramesh Kumar (SRM Express)', phone: '+91 98765 43210' },
    { id: 'dp-2', name: 'Suresh Babu (Campus Rider)', phone: '+91 98765 43211' },
    { id: 'dp-3', name: 'Manoj Kumar (Vit-ap Campus Courier)', phone: '+91 98765 43212' }
  ];
  const assignLatencies = [];
  let assignSuccess = 0;
  const partnerAssignPromises = sampleOrderIds.map((id, idx) => {
    const partner = partnerList[idx % partnerList.length];
    return assignPartner(id, partner);
  });
  const partnerAssignResults = await Promise.all(partnerAssignPromises);
  partnerAssignResults.forEach(r => {
    assignLatencies.push(r.duration);
    if (r.ok) assignSuccess++;
  });
  console.log(`Delivery partner assignments: ${assignSuccess}/${sampleOrderIds.length} succeeded.`);

  // 6. Restaurant Toggling & System Ordering Settings Under Traffic
  console.log('\n🏪 Step 6: Testing Restaurant Open/Close Toggles & Master Campus Switch under load...');
  const toggleResults = await Promise.all([
    toggleRestaurant('local-home-kitchen', false), // close
    toggleRestaurant('campus-delight', true),
    toggleSystemOrdering(true),
    toggleRestaurant('local-home-kitchen', true)  // reopen
  ]);
  const toggleSuccess = toggleResults.filter(r => r.ok).length;
  console.log(`Restaurant and master switch toggles: ${toggleSuccess}/${toggleResults.length} succeeded.`);

  // 7. Verification Directly in Neon DB
  console.log('\n🐘 Step 7: Direct verification in Neon Database...');
  let neonDbVerified = false;
  let neonOrderCount = 0;
  let neonStudentCount = 0;
  let neonRestaurantCount = 0;
  let neonSettingsStatus = '';

  if (dbUrl) {
    try {
      const sql = neon(dbUrl);
      const ordersInDb = await sql`SELECT count(*) as c FROM orders WHERE id LIKE 'CB-STRESS-%';`;
      const totalOrdersInDb = await sql`SELECT count(*) as c FROM orders;`;
      const studentsInDb = await sql`SELECT count(*) as c FROM students;`;
      const restaurantsInDb = await sql`SELECT count(*) as c FROM restaurants;`;
      const settingsInDb = await sql`SELECT ordering_enabled FROM system_settings WHERE id = 'global';`;

      neonOrderCount = parseInt(totalOrdersInDb[0]?.c || '0', 10);
      neonStudentCount = parseInt(studentsInDb[0]?.c || '0', 10);
      neonRestaurantCount = parseInt(restaurantsInDb[0]?.c || '0', 10);
      neonSettingsStatus = settingsInDb[0]?.ordering_enabled ? 'ACTIVE' : 'PAUSED';
      neonDbVerified = true;

      console.log(`Stress test orders in Neon DB: ${ordersInDb[0]?.c} recorded`);
      console.log(`Total orders in Neon DB:       ${neonOrderCount}`);
      console.log(`Total students in Neon DB:     ${neonStudentCount}`);
      console.log(`Total restaurants in Neon DB:  ${neonRestaurantCount}`);
      console.log(`Global ordering switch:        ${neonSettingsStatus}`);
    } catch (e) {
      console.error('Neon direct query check failed:', e.message);
    }
  }

  // 8. Calculate Metrics
  const avg = arr => (arr.reduce((a, b) => a + b, 0) / (arr.length || 1)).toFixed(1);
  const p95 = arr => {
    if (!arr.length) return '0';
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)];
  };

  console.log('\n====================================================');
  console.log('📊 TRAFFIC STRESS TEST RESULTS & BENCHMARK REPORT');
  console.log('====================================================');
  const totalRequests = profileSuccess + profileFailed + writeSuccess + writeFailed + readSuccess + readFailed + sampleOrderIds.length + assignSuccess + toggleSuccess;
  console.log(`Total Requests Handled: ${totalRequests}`);

  console.log(`\n--- 👤 CONCURRENT PROFILE UPDATES (WRITES) ---`);
  console.log(`Success Rate:           ${((profileSuccess / TOTAL_PROFILE_UPDATES) * 100).toFixed(1)}% (${profileSuccess}/${TOTAL_PROFILE_UPDATES})`);
  console.log(`Throughput:             ${(TOTAL_PROFILE_UPDATES / (profileTotalTime / 1000)).toFixed(1)} updates/sec`);
  console.log(`Avg Latency:            ${avg(profileLatencies)} ms`);
  console.log(`p95 Latency:            ${p95(profileLatencies)} ms`);

  console.log(`\n--- 🍔 CONCURRENT ORDERS (WRITES) ---`);
  console.log(`Success Rate:           ${((writeSuccess / TOTAL_ORDERS_TO_PLACE) * 100).toFixed(1)}% (${writeSuccess}/${TOTAL_ORDERS_TO_PLACE})`);
  console.log(`Throughput:             ${(TOTAL_ORDERS_TO_PLACE / (writeTotalTime / 1000)).toFixed(1)} orders/sec`);
  console.log(`Avg Latency:            ${avg(writeLatencies)} ms`);
  console.log(`p95 Latency:            ${p95(writeLatencies)} ms`);

  console.log(`\n--- 📡 HIGH-FREQUENCY POLLING (READS) ---`);
  console.log(`Success Rate:           ${((readSuccess / TOTAL_READ_REQUESTS) * 100).toFixed(1)}% (${readSuccess}/${TOTAL_READ_REQUESTS})`);
  console.log(`Throughput:             ${(TOTAL_READ_REQUESTS / (readTotalTime / 1000)).toFixed(1)} req/sec`);
  console.log(`Avg Latency:            ${avg(readLatencies)} ms`);
  console.log(`p95 Latency:            ${p95(readLatencies)} ms`);

  console.log(`\n--- 🛵 CONCURRENT PARTNER ASSIGNMENTS ---`);
  console.log(`Success Rate:           ${((assignSuccess / sampleOrderIds.length) * 100).toFixed(1)}% (${assignSuccess}/${sampleOrderIds.length})`);
  console.log(`Avg Latency:            ${avg(assignLatencies)} ms`);
  console.log(`p95 Latency:            ${p95(assignLatencies)} ms`);

  console.log(`\n--- 🏪 RESTAURANT & SYSTEM TOGGLES ---`);
  console.log(`Success Rate:           ${((toggleSuccess / toggleResults.length) * 100).toFixed(1)}% (${toggleSuccess}/${toggleResults.length})`);

  console.log(`\n--- 🐘 NEON DATABASE INTEGRITY ---`);
  console.log(`Database Connection:    ${neonDbVerified ? '✅ 100% Intact & Healthy' : '⚠️ Warning'}`);
  console.log(`Total DB Records:       ${neonOrderCount} Orders | ${neonStudentCount} Students | ${neonRestaurantCount} Restaurants`);
  console.log(`Global Ordering State:  ${neonSettingsStatus}`);
  console.log('====================================================\n');
}

runBenchmark().catch(console.error);

