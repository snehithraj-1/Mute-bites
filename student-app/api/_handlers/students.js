import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_1vc6drlGiWJT@ep-billowing-cake-b4cx6gae-pooler.c-6.us-east-2.aws.neon.tech/mute%20bites?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const students = await sql`
        SELECT 
          id,
          name,
          email,
          student_id,
          phone,
          hostel_block,
          room_number,
          COALESCE(total_orders, 0) AS total_orders,
          created_at,
          updated_at
        FROM students
        ORDER BY updated_at DESC;
      `;
      return res.status(200).json({
        success: true,
        students: students || [],
        count: students ? students.length : 0,
        source: 'neon'
      });
    } catch (err) {
      console.error('[Vercel Students GET Error]:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch students: ' + err.message,
        students: []
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, name, email, student_id, phone, hostel_block, room_number, role } = req.body || {};
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const studentId = id || `vit-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const studentName = (name || '').trim() || cleanEmail.split('@')[0];
      const studentPhone = (phone || '').trim() || null;

      await sql`
        INSERT INTO students (
          id, name, email, student_id, phone, hostel_block, room_number, role, created_at, updated_at
        ) VALUES (
          ${studentId},
          ${studentName},
          ${cleanEmail},
          ${student_id || null},
          ${studentPhone},
          ${hostel_block || null},
          ${room_number || null},
          ${role || 'student'},
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = CASE WHEN EXCLUDED.name IS NOT NULL AND EXCLUDED.name != '' THEN EXCLUDED.name ELSE students.name END,
          phone = CASE WHEN EXCLUDED.phone IS NOT NULL AND EXCLUDED.phone != '' THEN EXCLUDED.phone ELSE students.phone END,
          student_id = COALESCE(EXCLUDED.student_id, students.student_id),
          hostel_block = COALESCE(EXCLUDED.hostel_block, students.hostel_block),
          room_number = COALESCE(EXCLUDED.room_number, students.room_number),
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
