import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDbUrl() {
  const envText = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
  const match = envText.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
  return match ? match[1].trim() : 'postgresql://neondb_owner:npg_3O6tHydAMuSg@ep-soft-flower-a5yk954q-pooler.us-east-2.aws.neon.tech/Mutebites?sslmode=require&channel_binding=require';
}

async function renameRestaurant() {
  const dbUrl = getDbUrl();
  console.log('Connecting to Neon DB...');
  const sql = neon(dbUrl);

  console.log('Updating restaurant name to "Biryani Nation"...');
  await sql`
    UPDATE restaurants 
    SET name = 'Biryani Nation', updated_at = NOW() 
    WHERE id = 'clg-bites-biryani-nation';
  `;

  console.log('Updating menu_items restaurant_name to "Biryani Nation"...');
  await sql`
    UPDATE menu_items 
    SET restaurant_name = 'Biryani Nation', updated_at = NOW() 
    WHERE restaurant_id = 'clg-bites-biryani-nation';
  `;

  console.log('Updating admin_accounts name for clgbites_admin...');
  await sql`
    UPDATE admin_accounts 
    SET name = 'Biryani Nation Staff', updated_at = NOW() 
    WHERE id = 'admin-clg' OR restaurant_id = 'clg-bites-biryani-nation';
  `;

  const restaurants = await sql`
    SELECT id, name, location, is_open 
    FROM restaurants 
    WHERE id = 'clg-bites-biryani-nation';
  `;
  console.log('✅ Updated Restaurant:', restaurants);
}

renameRestaurant().catch(console.error);
