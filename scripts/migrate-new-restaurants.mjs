import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AUTHENTIC_RESTAURANTS, AUTHENTIC_MENU_ITEMS } from '../server/authenticMenuData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, 'utf8');
  const match = envText.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
  if (match) dbUrl = match[1].trim();
}

if (!dbUrl) {
  console.error('❌ DATABASE_URL is not defined in environment or .env');
  process.exit(1);
}

console.log('Connecting to Neon database:', dbUrl.replace(/:[^:@]+@/, ':****@'));
const sql = neon(dbUrl);

async function migrate() {
  try {
    const dbInfo = await sql`SELECT current_database(), now()`;
    console.log(`Connected to database: ${dbInfo[0].current_database}`);

    // 1. Delete old menu items
    console.log('1. Clearing old menu items...');
    await sql`DELETE FROM menu_items WHERE restaurant_id NOT IN ('bheemasena-restaurant', 'a1-biryani-point', 'bismillah-fruit-juice');`;
    console.log('✓ Old menu items cleared.');

    // 2. Delete old restaurants
    console.log('2. Clearing old restaurants...');
    await sql`DELETE FROM restaurants WHERE id NOT IN ('bheemasena-restaurant', 'a1-biryani-point', 'bismillah-fruit-juice');`;
    console.log('✓ Old restaurants cleared.');

    // 3. Upsert the 3 new restaurants
    console.log('3. Upserting the 3 new restaurants (Bheemasena, A1 Biryani Point, Bismillah Fruit Juice)...');
    for (const r of AUTHENTIC_RESTAURANTS) {
      await sql`
        INSERT INTO restaurants (
          id, name, description, cuisine, location, phone, rating, prep_time, image_url, is_open, created_at, updated_at
        ) VALUES (
          ${r.id}, ${r.name}, ${r.description}, ${r.cuisine}, ${r.location}, ${r.phone}, ${r.rating}, ${r.prep_time}, ${r.image_url}, ${r.is_open}, NOW(), NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          cuisine = EXCLUDED.cuisine,
          location = EXCLUDED.location,
          phone = EXCLUDED.phone,
          rating = EXCLUDED.rating,
          prep_time = EXCLUDED.prep_time,
          image_url = EXCLUDED.image_url,
          is_open = EXCLUDED.is_open,
          updated_at = NOW();
      `;
      console.log(`   ✨ Restaurant saved: ${r.name} (${r.id})`);
    }

    // 4. Upsert the 56 new menu items
    console.log(`4. Inserting ${AUTHENTIC_MENU_ITEMS.length} new authentic dishes...`);
    let count = 0;
    for (const item of AUTHENTIC_MENU_ITEMS) {
      await sql`
        INSERT INTO menu_items (
          id, restaurant_id, restaurant_name, category, name, description, price, is_veg, is_available, image_url, preparation_time, rating, created_at, updated_at
        ) VALUES (
          ${item.id},
          ${item.restaurant_id},
          ${item.restaurant_name},
          ${item.category},
          ${item.name},
          ${item.description},
          ${item.price},
          ${item.is_veg},
          true,
          ${item.image_url},
          ${item.preparation_time || '15-20 mins'},
          ${item.rating || 4.8},
          NOW(),
          NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          restaurant_id = EXCLUDED.restaurant_id,
          restaurant_name = EXCLUDED.restaurant_name,
          category = EXCLUDED.category,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          is_veg = EXCLUDED.is_veg,
          is_available = true,
          image_url = EXCLUDED.image_url,
          preparation_time = EXCLUDED.preparation_time,
          rating = EXCLUDED.rating,
          updated_at = NOW();
      `;
      count++;
    }
    console.log(`✓ Inserted ${count} menu items successfully.`);

    // 5. Update admin accounts
    console.log('5. Updating admin accounts for the 3 restaurants...');
    // Clean old scoped admin accounts
    await sql`DELETE FROM admin_accounts WHERE id IN ('admin-lhk', 'admin-clg', 'admin-vilasa');`;

    const adminAccounts = [
      { id: 'admin-super', username: 'collagebites1@gmail.com', name: 'Mutebites Super Admin', role: 'super_admin', restaurant_id: null, pass: 'Clgbites123' },
      { id: 'admin-super-alias', username: 'collagebites@gmail.com', name: 'Mutebites Admin', role: 'super_admin', restaurant_id: null, pass: 'Clgbites123' },
      { id: 'admin-bheemasena', username: 'bheemasena_admin', name: 'Bheemasena Restaurant Staff', role: 'restaurant_admin', restaurant_id: 'bheemasena-restaurant', pass: 'Bheema@Campus2026' },
      { id: 'admin-a1', username: 'a1_admin', name: 'A1 Biryani Point Staff', role: 'restaurant_admin', restaurant_id: 'a1-biryani-point', pass: 'A1@Campus2026' },
      { id: 'admin-bismillah', username: 'bismillah_admin', name: 'Bismillah Fruit Juice Staff', role: 'restaurant_admin', restaurant_id: 'bismillah-fruit-juice', pass: 'Bismillah@Campus2026' }
    ];

    for (const a of adminAccounts) {
      await sql`
        INSERT INTO admin_accounts (id, username, name, role, restaurant_id, password_hash, created_at, updated_at)
        VALUES (${a.id}, ${a.username}, ${a.name}, ${a.role}, ${a.restaurant_id}, ${a.pass}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          restaurant_id = EXCLUDED.restaurant_id,
          password_hash = EXCLUDED.password_hash,
          updated_at = NOW();
      `;
    }
    console.log('✓ Admin accounts configured.');

    // 6. Update Delivery Partners
    console.log('6. Updating delivery riders...');
    await sql`
      INSERT INTO delivery_partners (id, name, phone, restaurant_id, pin, is_active, is_available)
      VALUES 
        ('dp-bheema-1', 'Ramesh (Bheemasena Rider)', '8247075652', 'bheemasena-restaurant', '1234', true, true),
        ('dp-a1-1', 'Suresh (A1 Biryani Rider)', '8247075652', 'a1-biryani-point', '1234', true, true),
        ('dp-bismillah-1', 'Imran (Bismillah Juice Rider)', '8247075652', 'bismillah-fruit-juice', '1234', true, true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        restaurant_id = EXCLUDED.restaurant_id,
        is_active = true;
    `;
    console.log('✓ Delivery riders configured.');

    // 7. Verification
    console.log('\n========================================');
    console.log('🎉 VERIFICATION RESULTS');
    console.log('========================================');

    const restRes = await sql`SELECT id, name, cuisine, phone, is_open FROM restaurants ORDER BY name;`;
    console.log('\nActive Restaurants:');
    console.table(restRes);

    const catRes = await sql`
      SELECT restaurant_name, category, count(*) as items_count 
      FROM menu_items 
      GROUP BY restaurant_name, category 
      ORDER BY restaurant_name, category;
    `;
    console.log('\nDishes by Category:');
    console.table(catRes);

    const totalMenu = await sql`SELECT count(*) FROM menu_items;`;
    console.log(`\nTotal Menu Items in Database: ${totalMenu[0].count}`);

    const admins = await sql`SELECT id, username, name, role, restaurant_id FROM admin_accounts ORDER BY role, username;`;
    console.log('\nAdmin Accounts:');
    console.table(admins);

    console.log('\n✅ All three restaurants and menu items are live in Neon DB!');

  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

migrate();
