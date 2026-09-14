import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_3O6tHydAMuSg@ep-soft-flower-a5yk954q-pooler.us-east-2.aws.neon.tech/Mutebites?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { id, name, email, phone, role } = req.body || {};
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const studentId = id || `vit-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const studentName = (name || '').trim() || cleanEmail.split('@')[0];
      const studentPhone = (phone || '').trim() || '8247075652';

      await sql`
        INSERT INTO students (id, name, email, phone, role, created_at, updated_at)
        VALUES (${studentId}, ${studentName}, ${cleanEmail}, ${studentPhone}, ${role || 'student'}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          updated_at = NOW();
      `;

      return res.status(200).json({
        success: true,
        student: { id: studentId, name: studentName, email: cleanEmail, phone: studentPhone, role: role || 'student' }
      });
    } catch (err) {
      console.error('[Vercel Students POST Error]:', err.message);
      return res.status(500).json({ error: 'Failed to update student: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
