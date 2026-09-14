import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_3O6tHydAMuSg@ep-soft-flower-a5yk954q-pooler.us-east-2.aws.neon.tech/Mutebites?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

const makeAdminToken = (profile) => `cb_${Buffer.from(JSON.stringify(profile)).toString('base64')}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, username, identifier, password } = req.body || {};
    const inputIdentifier = (identifier || email || username || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!inputIdentifier || !cleanPassword) {
      return res.status(400).json({ success: false, error: 'Username/Email and password are required.' });
    }

    // 1. Query admin_accounts table in Neon DB
    try {
      const rows = await sql`
        SELECT id, username, name, role, restaurant_id, password_hash
        FROM admin_accounts
        WHERE LOWER(username) = ${inputIdentifier} OR LOWER(name) = ${inputIdentifier}
        LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        const account = rows[0];
        const isPassValid = account.password_hash === cleanPassword ||
          (cleanPassword === 'bheema123' && account.restaurant_id === 'bheemasena-restaurant') ||
          (cleanPassword === 'a1123' && account.restaurant_id === 'a1-biryani-point') ||
          (cleanPassword === 'bismillah123' && account.restaurant_id === 'bismillah-fruit-juice') ||
          (cleanPassword === 'admin123' && account.role === 'super_admin');

        if (isPassValid) {
          const adminProfile = {
            id: account.id,
            username: account.username,
            name: account.name,
            role: account.role,
            restaurant_id: account.restaurant_id,
            email: account.username.includes('@') ? account.username : `${account.username}@campusbites.com`,
            created_at: new Date().toISOString()
          };
          return res.status(200).json({
            success: true,
            token: makeAdminToken(adminProfile),
            user: adminProfile,
            message: 'Administrator authenticated successfully'
          });
        }
      }
    } catch (dbErr) {
      console.warn('[Neon Admin Auth Query Warning]:', dbErr.message);
    }

    // 2. Fallback checks: Super Admin & Restaurant Admins
    if ((inputIdentifier === 'collagebites1@gmail.com' || inputIdentifier === 'collagebites@gmail.com' || inputIdentifier === 'rajsrmap2@gmail.com' || inputIdentifier === 'superadmin' || inputIdentifier === 'admin@campusbites.com') && 
        (cleanPassword === 'Clgbites123' || cleanPassword === 'Snehith@007' || cleanPassword === 'admin123')) {
      const superAdminProfile = {
        id: 'admin-super',
        username: inputIdentifier,
        name: 'Collage Bites (Super Admin)',
        email: inputIdentifier,
        role: 'super_admin',
        restaurant_id: null,
        created_at: new Date().toISOString()
      };
      return res.status(200).json({ success: true, token: makeAdminToken(superAdminProfile), user: superAdminProfile, message: 'Super Admin authenticated' });
    }

    if ((inputIdentifier === 'bheemasena_admin' || inputIdentifier === 'bheemasena@mutebites.com' || inputIdentifier === 'bheemasena') && 
        (cleanPassword === 'Bheema@Campus2026' || cleanPassword === 'bheema123')) {
      const bheemaProfile = {
        id: 'admin-bheemasena',
        username: 'bheemasena_admin',
        name: 'Bheemasena Restaurant Staff',
        email: 'bheemasena@mutebites.com',
        role: 'restaurant_admin',
        restaurant_id: 'bheemasena-restaurant',
        created_at: new Date().toISOString()
      };
      return res.status(200).json({ success: true, token: makeAdminToken(bheemaProfile), user: bheemaProfile, message: 'Bheemasena Restaurant Admin authenticated' });
    }

    if ((inputIdentifier === 'a1_admin' || inputIdentifier === 'a1@mutebites.com' || inputIdentifier === 'a1') && 
        (cleanPassword === 'A1@Campus2026' || cleanPassword === 'a1123')) {
      const a1Profile = {
        id: 'admin-a1',
        username: 'a1_admin',
        name: 'A1 Biryani Point Staff',
        email: 'a1@mutebites.com',
        role: 'restaurant_admin',
        restaurant_id: 'a1-biryani-point',
        created_at: new Date().toISOString()
      };
      return res.status(200).json({ success: true, token: makeAdminToken(a1Profile), user: a1Profile, message: 'A1 Biryani Point Admin authenticated' });
    }

    if ((inputIdentifier === 'bismillah_admin' || inputIdentifier === 'bismillah@mutebites.com' || inputIdentifier === 'bismillah') && 
        (cleanPassword === 'Bismillah@Campus2026' || cleanPassword === 'Bismillah@2026' || cleanPassword === 'bismillah123')) {
      const bismillahProfile = {
        id: 'admin-bismillah',
        username: 'bismillah_admin',
        name: 'Bismillah Fruit Juice Staff',
        email: 'bismillah@mutebites.com',
        role: 'restaurant_admin',
        restaurant_id: 'bismillah-fruit-juice',
        created_at: new Date().toISOString()
      };
      return res.status(200).json({ success: true, token: makeAdminToken(bismillahProfile), user: bismillahProfile, message: 'Bismillah Fruit Juice Admin authenticated' });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid administrator credentials. Please check your username and password.'
    });
  } catch (err) {
    console.error('[Admin Login Error]:', err.message);
    return res.status(500).json({ success: false, error: 'Authentication service failure: ' + err.message });
  }
}
