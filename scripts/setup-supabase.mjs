import pg from 'pg';
import { AUTHENTIC_RESTAURANTS, AUTHENTIC_MENU_ITEMS } from '../server/authenticMenuData.js';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Mutebites%40123@db.wymxfaheyhvcqyahludl.supabase.co:5432/postgres';

async function initSupabase() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL at db.wymxfaheyhvcqyahludl.supabase.co...');
    await client.connect();
    console.log('✅ Connected successfully to Supabase PostgreSQL!');

    console.log('1. Creating `students` table...');
    await client.query(`
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
    `);

    console.log('2. Creating `orders` table...');
    await client.query(`
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
        status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
        instructions TEXT,
        items JSONB NOT NULL,
        delivery_partner_id VARCHAR(50),
        delivery_partner_name VARCHAR(255),
        delivery_partner_phone VARCHAR(50),
        payment_method VARCHAR(50) DEFAULT 'cod',
        payment_status VARCHAR(50) DEFAULT 'PENDING',
        hostel_block VARCHAR(100),
        room_number VARCHAR(100),
        cancelled_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        confirmation_expires_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('3. Creating `order_status_history` table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        changed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('4. Creating `restaurants` table...');
    await client.query(`
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
    `);

    console.log('5. Creating `restaurant_statuses` table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_statuses (
        restaurant_id VARCHAR(100) PRIMARY KEY,
        status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('6. Creating `menu_items` table...');
    await client.query(`
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
        rating NUMERIC DEFAULT 4.8,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('7. Creating `food_images` table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS food_images (
        id VARCHAR(100) PRIMARY KEY,
        image_data TEXT NOT NULL,
        mime_type VARCHAR(50) DEFAULT 'image/jpeg',
        filename VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('8. Creating `otp_verifications` table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        email VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(10) NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(50),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('9. Creating `delivery_partners` table...');
    await client.query(`
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
    `);

    console.log('10. Creating `system_settings` table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(50) PRIMARY KEY,
        setting_key VARCHAR(100),
        setting_value TEXT,
        ordering_enabled BOOLEAN DEFAULT true,
        platform_enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('11. Creating `admin_accounts` table...');
    await client.query(`
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
    `);

    console.log('12. Seeding restaurants into Supabase...');
    for (const r of AUTHENTIC_RESTAURANTS) {
      await client.query(`
        INSERT INTO restaurants (
          id, name, description, cuisine, location, phone, rating, prep_time, image_url, is_open, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
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
      `, [r.id, r.name, r.description, r.cuisine, r.location, r.phone, r.rating || 4.8, r.prep_time || '15-20 min', r.image_url, r.is_open ?? true]);

      await client.query(`
        INSERT INTO restaurant_statuses (restaurant_id, status, updated_at)
        VALUES ($1, 'OPEN', NOW())
        ON CONFLICT (restaurant_id) DO NOTHING;
      `, [r.id]);
    }

    console.log('13. Seeding menu items into Supabase...');
    for (const item of AUTHENTIC_MENU_ITEMS) {
      await client.query(`
        INSERT INTO menu_items (
          id, restaurant_id, restaurant_name, category, name, description, price, is_veg, is_available, image_url, preparation_time, rating, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          category = EXCLUDED.category,
          is_veg = EXCLUDED.is_veg,
          image_url = EXCLUDED.image_url,
          updated_at = NOW();
      `, [
        item.id,
        item.restaurant_id,
        item.restaurant_name,
        item.category,
        item.name,
        item.description,
        item.price,
        item.is_veg,
        item.is_available ?? true,
        item.image_url,
        item.preparation_time || '15-20 mins',
        item.rating || 4.8
      ]);
    }

    console.log('14. Seeding admin accounts into Supabase...');
    const adminAccounts = [
      ['admin-super', 'collagebites1@gmail.com', 'Collage Bites (Super Admin)', 'super_admin', null, 'Clgbites123'],
      ['admin-super-alias', 'collagebites@gmail.com', 'Collage Bites Admin', 'super_admin', null, 'Clgbites123'],
      ['admin-super-raj', 'rajsrmap2@gmail.com', 'Raj (Super Admin)', 'super_admin', null, 'Clgbites123'],
      ['admin-bhm', 'bhm_admin', 'Bheemasena Restaurant Admin', 'restaurant_admin', 'bheemasena-restaurant', 'Bhm@Campus2026'],
      ['admin-a1', 'a1_admin', 'A1 Biryani Point Admin', 'restaurant_admin', 'a1-biryani-point', 'A1@Campus2026'],
      ['admin-bismillah', 'bismillah_admin', 'Bismillah Juice Admin', 'restaurant_admin', 'bismillah-fruit-juice', 'Juice@Campus2026'],
      ['admin-fruits', 'fruits_admin', 'Fresh Fruits Admin', 'restaurant_admin', 'mutebites-fresh-fruits', 'Fruit@Campus2026'],
      ['admin-chinese', 'chinese_admin', 'Food Corner Admin', 'restaurant_admin', 'mutebites-chinese', 'Food@Campus2026'],
      ['admin-lhk', 'lhk_admin', 'Local Home Kitchen Staff', 'restaurant_admin', 'local-home-kitchen', 'LHK@Campus2026'],
      ['admin-clg', 'clgbites_admin', 'Biryani Nation Staff', 'restaurant_admin', 'clg-bites-biryani-nation', 'CLG@Campus2026']
    ];

    for (const [id, username, name, role, restaurant_id, password_hash] of adminAccounts) {
      await client.query(`
        INSERT INTO admin_accounts (id, username, name, role, restaurant_id, password_hash, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          restaurant_id = EXCLUDED.restaurant_id,
          updated_at = NOW();
      `, [id, username, name, role, restaurant_id, password_hash]);
    }

    console.log('15. Seeding delivery partners into Supabase...');
    const deliveryPartners = [
      ['dp-1', 'Ramesh Kumar (Campus Rider)', '9989955833', 'all', '1234'],
      ['dp-2', 'Suresh Reddy (Campus Rider)', '9398414231', 'all', '1234'],
      ['dp-3', 'Rajesh Sharma (Campus Rider)', '8247840765', 'all', '1234'],
      ['dp-4', 'Lenka Babu (Campus Rider)', '8240756887', 'all', '1234']
    ];

    for (const [id, name, phone, restaurant_id, pin] of deliveryPartners) {
      await client.query(`
        INSERT INTO delivery_partners (id, name, phone, restaurant_id, pin, is_active, is_available, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, true, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          restaurant_id = EXCLUDED.restaurant_id,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
      `, [id, name, phone, restaurant_id, pin]);
    }

    console.log('16. Seeding system settings...');
    await client.query(`
      INSERT INTO system_settings (id, setting_key, setting_value, ordering_enabled, platform_enabled, updated_at)
      VALUES ('global', 'overall_ordering', 'true', true, true, NOW())
      ON CONFLICT (id) DO UPDATE SET
        ordering_enabled = true,
        platform_enabled = true,
        updated_at = NOW();
    `);

    console.log('17. Creating performance indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_student_email ON orders(student_email);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_menu_restaurant ON menu_items(restaurant_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category);`);

    console.log('\n====================================================');
    console.log('🎉 ALL TABLES, RESTAURANTS, MENUS & ACCOUNTS STORED IN SUPABASE!');
    console.log('====================================================');

    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    console.log('\nTables in public schema:');
    console.table(tables.rows);

    const rCount = await client.query("SELECT count(*) FROM restaurants;");
    const mCount = await client.query("SELECT count(*) FROM menu_items;");
    const aCount = await client.query("SELECT count(*) FROM admin_accounts;");
    const dCount = await client.query("SELECT count(*) FROM delivery_partners;");
    console.log(`Summary: ${rCount.rows[0].count} restaurants, ${mCount.rows[0].count} menu items, ${aCount.rows[0].count} admin accounts, ${dCount.rows[0].count} delivery partners.`);

  } catch (err) {
    console.error('❌ Supabase initialization error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initSupabase();
