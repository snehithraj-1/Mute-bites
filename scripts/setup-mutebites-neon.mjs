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
  dbUrl = 'postgresql://neondb_owner:npg_1vc6drlGiWJT@ep-billowing-cake-b4cx6gae-pooler.c-6.us-east-2.aws.neon.tech/mute%20bites?sslmode=require&channel_binding=require';
}

console.log('🚀 Connecting to Neon PostgreSQL:', dbUrl.replace(/:[^:@]+@/, ':****@'));
const sql = neon(dbUrl);

async function setupDatabase() {
  try {
    const dbInfo = await sql`SELECT current_database(), now();`;
    console.log(`✅ Connected successfully to: "${dbInfo[0].current_database}" at ${dbInfo[0].now}`);

    console.log('\n[1/10] Creating `students` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        student_id VARCHAR(100),
        phone VARCHAR(50),
        hostel_block VARCHAR(100),
        room_number VARCHAR(100),
        total_orders INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('[2/10] Creating `orders` table & schema...');
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(255),
        student_name VARCHAR(255) NOT NULL,
        student_email VARCHAR(255),
        student_phone VARCHAR(50) NOT NULL,
        student_id VARCHAR(100),
        delivery_location TEXT NOT NULL,
        restaurant_id VARCHAR(100) NOT NULL,
        restaurant_name VARCHAR(255) NOT NULL,
        total_amount NUMERIC NOT NULL,
        status VARCHAR(50) NOT NULL,
        instructions TEXT,
        items JSONB NOT NULL,
        delivery_partner_id VARCHAR(50),
        delivery_partner_name VARCHAR(255),
        delivery_partner_phone VARCHAR(50),
        cancelled_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS student_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS user_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
    `;

    console.log('[3/10] Creating `order_status_history` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        changed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('[4/10] Creating `menu_items` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS menu_items (
        id VARCHAR(100) PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        restaurant_name VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC NOT NULL,
        category VARCHAR(100) NOT NULL,
        is_veg BOOLEAN DEFAULT true,
        is_available BOOLEAN DEFAULT true,
        image_url TEXT,
        preparation_time VARCHAR(50) DEFAULT '15-20 mins',
        rating NUMERIC DEFAULT 4.5,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;`;
    await sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS preparation_time VARCHAR(50) DEFAULT '15-20 mins';`;

    console.log('[5/10] Creating `food_images` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS food_images (
        id VARCHAR(100) PRIMARY KEY,
        image_data TEXT NOT NULL,
        mime_type VARCHAR(50) DEFAULT 'image/jpeg',
        filename VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('[6/10] Creating `otp_verifications` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        email VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(10) NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(50),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('[7/10] Creating `delivery_partners` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS delivery_partners (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        pin VARCHAR(20) DEFAULT '1234',
        restaurant_id VARCHAR(100) DEFAULT 'all',
        is_active BOOLEAN DEFAULT true,
        is_available BOOLEAN DEFAULT true,
        total_deliveries INT DEFAULT 0,
        email VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('[8/10] Creating `system_settings` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(50) PRIMARY KEY,
        ordering_enabled BOOLEAN DEFAULT true,
        platform_enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS platform_enabled BOOLEAN DEFAULT true;`;
    await sql`
      INSERT INTO system_settings (id, ordering_enabled, platform_enabled, updated_at)
      VALUES ('global', true, true, NOW())
      ON CONFLICT (id) DO UPDATE SET
        ordering_enabled = true,
        platform_enabled = true,
        updated_at = NOW();
    `;

    console.log('[9/10] Creating `restaurants` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS restaurants (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cuisine VARCHAR(100),
        location TEXT,
        phone VARCHAR(50),
        rating NUMERIC DEFAULT 4.8,
        prep_time VARCHAR(50) DEFAULT '15-20 min',
        image_url TEXT,
        is_open BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('[10/10] Creating `admin_accounts` table...');
    await sql`
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        restaurant_id VARCHAR(100),
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('\n📦 Seeding Authentic Restaurants...');
    for (const r of AUTHENTIC_RESTAURANTS) {
      await sql`
        INSERT INTO restaurants (
          id, name, description, cuisine, location, phone, rating, prep_time, image_url, is_open, created_at, updated_at
        ) VALUES (
          ${r.id}, ${r.name}, ${r.description}, ${r.cuisine}, ${r.location}, ${r.phone}, ${r.rating}, ${r.prep_time}, ${r.image_url}, ${r.is_open !== false}, NOW(), NOW()
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
    }
    console.log(`✅ Seeded ${AUTHENTIC_RESTAURANTS.length} restaurants!`);

    console.log('\n🍲 Seeding Authentic Menu Items...');
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
          ${item.is_veg !== false},
          true,
          ${item.image_url},
          '15-20 mins',
          4.8,
          NOW(),
          NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          restaurant_id = EXCLUDED.restaurant_id,
          restaurant_name = EXCLUDED.restaurant_name,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          category = EXCLUDED.category,
          is_veg = EXCLUDED.is_veg,
          image_url = EXCLUDED.image_url,
          updated_at = NOW();
      `;
    }
    console.log(`✅ Seeded ${AUTHENTIC_MENU_ITEMS.length} menu items!`);

    console.log('\n🔑 Seeding Admin Accounts...');
    await sql`
      INSERT INTO admin_accounts (id, username, name, role, restaurant_id, password_hash)
      VALUES 
        ('admin-super', 'collagebites1@gmail.com', 'Collage Bites (Super Admin)', 'super_admin', null, 'Clgbites123'),
        ('admin-super-alias', 'collagebites@gmail.com', 'Collage Bites Admin', 'super_admin', null, 'Clgbites123'),
        ('admin-bheemasena', 'bheemasena_admin', 'Bheemasena Restaurant Staff', 'restaurant_admin', 'bheemasena-restaurant', 'Bheema@Campus2026'),
        ('admin-a1', 'a1_admin', 'A1 Biryani Point Staff', 'restaurant_admin', 'a1-biryani-point', 'A1@Campus2026'),
        ('admin-bismillah', 'bismillah_admin', 'Bismillah Fruit Juice Staff', 'restaurant_admin', 'bismillah-fruit-juice', 'Bismillah@Campus2026'),
        ('admin-fruits', 'fruits_admin', 'Mutebites Fresh Fruits Staff', 'restaurant_admin', 'mutebites-fresh-fruits', 'Fruits@Campus2026'),
        ('admin-chinese', 'chinese_admin', 'Food Corner Staff', 'restaurant_admin', 'mutebites-chinese', 'Chinese@Campus2026')
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        restaurant_id = EXCLUDED.restaurant_id,
        updated_at = NOW();
    `;
    console.log('✅ Seeded 7 Admin Accounts!');

    console.log('\n🚴 Seeding Delivery Partners...');
    await sql`
      INSERT INTO delivery_partners (id, name, phone, restaurant_id, pin, is_active, is_available)
      VALUES 
        ('dp-bheema-1', 'Ramesh (Bheemasena Rider)', '8247075652', 'bheemasena-restaurant', '1234', true, true),
        ('dp-a1-1', 'Suresh (A1 Biryani Rider)', '8247075652', 'a1-biryani-point', '1234', true, true),
        ('dp-bismillah-1', 'Imran (Bismillah Juice Rider)', '8247075652', 'bismillah-fruit-juice', '1234', true, true),
        ('dp-fruits-1', 'Kalyan (Fruits Rider)', '8247075652', 'mutebites-fresh-fruits', '1234', true, true),
        ('dp-chinese-1', 'Venkatesh (Food Corner Rider)', '8247075652', 'mutebites-chinese', '1234', true, true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        restaurant_id = EXCLUDED.restaurant_id,
        is_active = true,
        is_available = true;
    `;
    console.log('✅ Seeded 5 Delivery Partners!');

    console.log('\n⚡ Creating Indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_student_email ON orders(student_email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_menu_restaurant ON menu_items(restaurant_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category);`;
    console.log('✅ Indexes verified!');

    console.log('\n========================================');
    console.log('🎉 VERIFICATION & SUMMARY');
    console.log('========================================');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log(`Total public tables in Neon: ${tables.length}`);
    for (const t of tables) {
      const res = await sql.query(`SELECT count(*) as count FROM "${t.table_name}";`);
      console.log(`  📊 ${t.table_name.padEnd(24)} : ${res.rows[0].count} rows`);
    }

    console.log('\n✨ Database fully configured and all initial data successfully stored!');
  } catch (err) {
    console.error('❌ Setup error:', err);
    process.exit(1);
  }
}

setupDatabase();
