import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_3O6tHydAMuSg@ep-soft-flower-a5yk954q-pooler.us-east-2.aws.neon.tech/Mutebites?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

async function main() {
  console.log('Testing Neon connection...');
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`;
    console.log('Tables found:', tables.map(t => t.table_name));

    for (const t of tables) {
      const name = t.table_name;
      const count = await sql`SELECT count(*) as count FROM information_schema.columns WHERE table_name = ${name};`;
      let rowCount = 0;
      try {
        if (name === 'orders') {
          const res = await sql`SELECT count(*) as c FROM orders;`;
          rowCount = res[0].c;
        } else if (name === 'students') {
          const res = await sql`SELECT count(*) as c FROM students;`;
          rowCount = res[0].c;
        } else if (name === 'delivery_partners') {
          const res = await sql`SELECT count(*) as c FROM delivery_partners;`;
          rowCount = res[0].c;
        } else if (name === 'menu_items') {
          const res = await sql`SELECT count(*) as c FROM menu_items;`;
          rowCount = res[0].c;
        } else if (name === 'restaurants') {
          const res = await sql`SELECT count(*) as c FROM restaurants;`;
          rowCount = res[0].c;
        }
        console.log(`  Table '${name}': ${rowCount} rows`);
      } catch (err) {
        console.log(`  Table '${name}': error getting rows: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('Neon error:', err);
  }
}

main();
