import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_3O6tHydAMuSg@ep-soft-flower-a5yk954q-pooler.us-east-2.aws.neon.tech/Mutebites?sslmode=require&channel_binding=require';
const sql = neon(dbUrl);

async function checkNeon() {
  try {
    const timeRes = await sql`SELECT NOW() as current_time, current_database() as db_name, version() as pg_version`;
    const countRes = await sql`SELECT count(*) as total_orders FROM orders`;
    const recentOrders = await sql`
      SELECT id, student_name, student_phone, restaurant_name, total_amount, status, created_at 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    const tablesRes = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    console.log('====================================================');
    console.log('  🐘 NEON POSTGRESQL DATABASE CONNECTION: ACTIVE');
    console.log('====================================================');
    console.log('Connected DB:', timeRes[0].db_name);
    console.log('Neon Server Timestamp:', timeRes[0].current_time);
    console.log('Tables in Neon DB:', tablesRes.map(t => t.table_name).join(', '));
    console.log('Total Orders in Neon DB:', countRes[0].total_orders);
    console.log('\nLatest 5 Orders in Neon DB:');
    console.table(recentOrders);
  } catch (err) {
    console.error('❌ Neon DB Connection Failed:', err);
  }
}

checkNeon();
