import dns from 'dns';
import fs from 'fs';
import { neon } from '@neondatabase/serverless';

// Force IPv4 first to avoid Windows IPv6 connect timeouts
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const originalDnsLookup = dns.lookup;
const fallbackResolver = new dns.promises.Resolver();
fallbackResolver.setServers(['8.8.8.8', '1.1.1.1']);

dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  originalDnsLookup(hostname, options, (err, address, family) => {
    if (!err && address) {
      return callback(null, address, family);
    }
    fallbackResolver.resolve4(hostname).then((addrs) => {
      if (addrs && addrs.length > 0) {
        return callback(null, addrs[0], 4);
      }
      return callback(err || new Error('DNS resolution failed'));
    }).catch(callback);
  });
};

const envText = fs.readFileSync('.env', 'utf8');
const match = envText.match(/DATABASE_URL=(.+)/);
const conn = match ? match[1].trim() : '';

const sql = neon(conn);

async function update() {
  console.log('--- Updating Neon Database: Mutebites Chinese -> Food Corner ---');

  // 1. Update restaurant name
  const updateRest = await sql`
    UPDATE restaurants
    SET name = 'Food Corner', updated_at = NOW()
    WHERE id = 'mutebites-chinese'
    RETURNING id, name;
  `;
  console.log('✅ Updated restaurant:', updateRest);

  // 2. Update menu_items restaurant_name
  const updateMenu = await sql`
    UPDATE menu_items
    SET restaurant_name = 'Food Corner', updated_at = NOW()
    WHERE restaurant_id = 'mutebites-chinese';
  `;
  console.log('✅ Updated menu_items for Food Corner');

  // 3. Update admin_accounts
  const updateAdmin = await sql`
    UPDATE admin_accounts
    SET name = 'Food Corner Staff', updated_at = NOW()
    WHERE id = 'admin-chinese' OR restaurant_id = 'mutebites-chinese'
    RETURNING id, username, name;
  `;
  console.log('✅ Updated admin accounts:', updateAdmin);

  // 4. Verify restaurants table
  const allRests = await sql`SELECT id, name, is_open FROM restaurants ORDER BY id ASC;`;
  console.log('\n--- Current Restaurants in Neon DB ---');
  console.table(allRests);
}

update().catch((err) => {
  console.error('❌ Update failed:', err);
  process.exit(1);
});
