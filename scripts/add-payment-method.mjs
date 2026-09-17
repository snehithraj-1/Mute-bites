import pg from 'pg';
import { neon } from '@neondatabase/serverless';

const supabaseUrl = 'postgresql://postgres:Mutebites%40135@db.pxtizpwijvjzsmripmxy.supabase.co:5432/postgres';
const neonMuteUrl = 'postgresql://neondb_owner:npg_1vc6drlGiWJT@ep-billowing-cake-b4cx6gae-pooler.c-6.us-east-2.aws.neon.tech/mute%20bites?sslmode=require&channel_binding=require';
const neonClgUrl = 'postgresql://neondb_owner:npg_1vc6drlGiWJT@ep-billowing-cake-b4cx6gae-pooler.c-6.us-east-2.aws.neon.tech/clg%20bites?sslmode=require&channel_binding=require';

async function migrateSupabase() {
  console.log('--- Migrating Supabase Database ---');
  const client = new pg.Client({
    connectionString: supabaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  await client.query(`
    ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cod',
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS delivery_partner_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS delivery_partner_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS delivery_partner_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS hostel_block VARCHAR(100),
      ADD COLUMN IF NOT EXISTS room_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS confirmation_expires_at TIMESTAMPTZ;
  `);

  const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders';");
  console.log('✅ Supabase orders columns:', cols.rows.map(r => r.column_name).join(', '));
  await client.end();
}

async function migrateNeon(url, name) {
  console.log(`--- Migrating Neon ${name} Database ---`);
  const sql = neon(url);
  await sql`
    ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cod',
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS delivery_partner_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS delivery_partner_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS delivery_partner_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS hostel_block VARCHAR(100),
      ADD COLUMN IF NOT EXISTS room_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS confirmation_expires_at TIMESTAMPTZ;
  `;
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'orders';`;
  console.log(`✅ Neon ${name} orders columns:`, cols.map(c => c.column_name).join(', '));
}

async function main() {
  try {
    await migrateSupabase();
  } catch (err) {
    console.error('Supabase migration error:', err);
  }

  try {
    await migrateNeon(neonMuteUrl, 'mute bites');
  } catch (err) {
    console.error('Neon mute bites migration error:', err);
  }

  try {
    await migrateNeon(neonClgUrl, 'clg bites');
  } catch (err) {
    console.error('Neon clg bites migration error:', err);
  }
}

main();
