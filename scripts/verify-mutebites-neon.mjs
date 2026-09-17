import { neon } from '@neondatabase/serverless';

const dbUrl = 'postgresql://neondb_owner:npg_1vc6drlGiWJT@ep-billowing-cake-b4cx6gae-pooler.c-6.us-east-2.aws.neon.tech/mute%20bites?sslmode=require&channel_binding=require';
const sql = neon(dbUrl);

async function verify() {
  const db = await sql`SELECT current_database(), now();`;
  console.log('Database:', db[0].current_database);

  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;`;
  console.log('\nPublic tables in Neon:');
  
  for (const t of tables) {
    const res = await sql.query(`SELECT count(*) as count FROM "${t.table_name}";`);
    // sql.query returns array of rows or { rows }
    const count = Array.isArray(res) ? res[0]?.count : res?.rows?.[0]?.count;
    console.log(`  📊 ${t.table_name.padEnd(24)} : ${count} rows`);
  }

  console.log('\nRestaurants seeded:');
  const rests = await sql`SELECT id, name, cuisine, phone, is_open FROM restaurants ORDER BY name;`;
  console.table(rests);

  console.log('\nAdmin Accounts:');
  const admins = await sql`SELECT id, username, name, role, restaurant_id FROM admin_accounts ORDER BY id;`;
  console.table(admins);

  console.log('\nDelivery Riders:');
  const riders = await sql`SELECT id, name, phone, restaurant_id, is_active FROM delivery_partners ORDER BY id;`;
  console.table(riders);

  console.log('\nDishes Count by Category:');
  const cats = await sql`
    SELECT restaurant_name, category, count(*) as dishes
    FROM menu_items
    GROUP BY restaurant_name, category
    ORDER BY restaurant_name, category;
  `;
  console.table(cats);
}

verify().catch(console.error);
