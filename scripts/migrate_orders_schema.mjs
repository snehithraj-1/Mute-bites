import { neon } from '@neondatabase/serverless';

const DB_URL = 'postgresql://neondb_owner:npg_3O6tHydAMuSg@ep-soft-flower-a5yk954q-pooler.us-east-2.aws.neon.tech/Mutebites?sslmode=require&channel_binding=require';
const sql = neon(DB_URL);

async function migrate() {
  console.log('Running migration on Mutebites DB...');
  await sql`
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cod',
    ADD COLUMN IF NOT EXISTS delivery_partner_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS delivery_partner_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS delivery_partner_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS hostel_block VARCHAR(100),
    ADD COLUMN IF NOT EXISTS room_number VARCHAR(100);
  `;

  // Also make sure restaurants is_open are set to true so students can order
  await sql`
    UPDATE restaurants SET is_open = true;
  `;

  // Ensure system_settings has ordering_enabled = true
  await sql`
    INSERT INTO system_settings (id, ordering_enabled, platform_enabled, updated_at)
    VALUES ('global', true, true, NOW())
    ON CONFLICT (id) DO UPDATE SET
      ordering_enabled = true,
      platform_enabled = true,
      updated_at = NOW();
  `;

  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders';`;
  console.log('✅ Updated orders columns:', cols.map(c => c.column_name));

  const rests = await sql`SELECT id, name, is_open FROM restaurants;`;
  console.log('✅ Updated restaurants status:', rests);
}

migrate().catch(console.error);
