import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_3O6tHydAMuSg@ep-soft-flower-a5yk954q-pooler.us-east-2.aws.neon.tech/Mutebites?sslmode=require&channel_binding=require';
const sql = neon(dbUrl);

async function runMigration() {
  console.log('🚀 Starting Non-Destructive Multi-Role Schema Migration on Neon DB...');

  try {
    // 1. Inspect existing columns
    const cols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'delivery_partners';
    `;
    console.log('Existing columns in delivery_partners:', cols.map(c => c.column_name).join(', '));

    // Add missing columns
    await sql`
      ALTER TABLE delivery_partners 
        ADD COLUMN IF NOT EXISTS restaurant_id VARCHAR(50) DEFAULT 'local-home-kitchen',
        ADD COLUMN IF NOT EXISTS pin VARCHAR(10) DEFAULT '1234',
        ADD COLUMN IF NOT EXISTS email VARCHAR(100),
        ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `;

    // 2. Ensure system_settings has platform_enabled
    await sql`
      ALTER TABLE system_settings
        ADD COLUMN IF NOT EXISTS platform_enabled BOOLEAN DEFAULT TRUE;
    `;

    await sql`
      INSERT INTO system_settings (id, ordering_enabled, platform_enabled, updated_at)
      VALUES ('global', true, true, NOW())
      ON CONFLICT (id) DO UPDATE SET
        platform_enabled = COALESCE(system_settings.platform_enabled, true),
        updated_at = NOW();
    `;

    // 3. Ensure restaurants table has is_open
    await sql`
      ALTER TABLE restaurants
        ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT TRUE;
    `;

    await sql`
      INSERT INTO restaurants (id, name, description, is_open, location, created_at)
      VALUES 
        ('local-home-kitchen', 'Local Home Kitchen', 'Homestyle meals, biryanis & North/South Indian specials', true, 'SRM University AP - Campus Kitchen 1', NOW()),
        ('clg-bites-biryani-nation', 'CLG Bites', 'Authentic Biryanis, Starters & Fast Food', true, 'SRM University AP - Campus Kitchen 2', NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        is_open = COALESCE(restaurants.is_open, true);
    `;

    // 4. Create admin_accounts table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'restaurant_admin')),
        restaurant_id VARCHAR(50) REFERENCES restaurants(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 5. Seed Predefined Admin Accounts
    // Super Admin: rajsrmap2@gmail.com / Snehith@007
    await sql`
      INSERT INTO admin_accounts (id, username, password_hash, name, role, restaurant_id)
      VALUES ('admin-super', 'rajsrmap2@gmail.com', 'Snehith@007', 'Gaddam Snehithraj (Super Admin)', 'super_admin', NULL)
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = 'super_admin',
        updated_at = NOW();
    `;

    // Local Home Kitchen Admin: lhk_admin / LHK@Campus2026
    await sql`
      INSERT INTO admin_accounts (id, username, password_hash, name, role, restaurant_id)
      VALUES ('admin-lhk', 'lhk_admin', 'LHK@Campus2026', 'Local Home Kitchen Staff', 'restaurant_admin', 'local-home-kitchen')
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        restaurant_id = 'local-home-kitchen',
        role = 'restaurant_admin',
        updated_at = NOW();
    `;

    await sql`
      INSERT INTO admin_accounts (id, username, password_hash, name, role, restaurant_id)
      VALUES ('admin-lhk-email', 'lhk@campusbites.com', 'LHK@Campus2026', 'Local Home Kitchen Staff', 'restaurant_admin', 'local-home-kitchen')
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        restaurant_id = 'local-home-kitchen',
        role = 'restaurant_admin',
        updated_at = NOW();
    `;

    // CLG Bites Admin: clgbites_admin / CLG@Campus2026
    await sql`
      INSERT INTO admin_accounts (id, username, password_hash, name, role, restaurant_id)
      VALUES ('admin-clg', 'clgbites_admin', 'CLG@Campus2026', 'CLG Bites Staff', 'restaurant_admin', 'clg-bites-biryani-nation')
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        restaurant_id = 'clg-bites-biryani-nation',
        role = 'restaurant_admin',
        updated_at = NOW();
    `;

    await sql`
      INSERT INTO admin_accounts (id, username, password_hash, name, role, restaurant_id)
      VALUES ('admin-clg-email', 'clg@campusbites.com', 'CLG@Campus2026', 'CLG Bites Staff', 'restaurant_admin', 'clg-bites-biryani-nation')
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        restaurant_id = 'clg-bites-biryani-nation',
        role = 'restaurant_admin',
        updated_at = NOW();
    `;

    // 6. Update existing delivery partners
    await sql`
      UPDATE delivery_partners
      SET restaurant_id = 'clg-bites-biryani-nation', pin = '1234'
      WHERE phone = '8240756887' OR name ILIKE '%lenka%';
    `;

    await sql`
      UPDATE delivery_partners
      SET restaurant_id = 'clg-bites-biryani-nation', pin = '1234'
      WHERE phone = '8247840765' OR name ILIKE '%raj%';
    `;

    // Seed Local Home Kitchen partners
    const lhkPartners = await sql`SELECT COUNT(*)::int as count FROM delivery_partners WHERE restaurant_id = 'local-home-kitchen'`;
    if (lhkPartners[0].count === 0) {
      await sql`
        INSERT INTO delivery_partners (id, name, phone, restaurant_id, pin, is_active)
        VALUES 
          ('dp-lhk-1', 'Ramesh Kumar (LHK Rider)', '9989955833', 'local-home-kitchen', '1234', true),
          ('dp-lhk-2', 'Suresh Reddy (LHK Rider)', '9398414231', 'local-home-kitchen', '1234', true)
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    console.log('✅ Multi-Role Database Migration Completed Successfully!');

    const accounts = await sql`SELECT id, username, name, role, restaurant_id FROM admin_accounts ORDER BY role, username`;
    console.log('\nConfigured Admin Accounts:');
    console.table(accounts);

    const partners = await sql`SELECT id, name, phone, restaurant_id, pin, is_active FROM delivery_partners ORDER BY restaurant_id, name`;
    console.log('\nConfigured Delivery Partners:');
    console.table(partners);

  } catch (err) {
    console.error('❌ Migration Error:', err);
    process.exit(1);
  }
}

runMigration();
