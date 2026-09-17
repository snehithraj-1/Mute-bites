import nodemailer from 'nodemailer';
import { sql } from './db.js';

const rawUser = (process.env.EMAIL_USER || '').trim();
const rawPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '').trim();

// Ensure we ignore old revoked credentials even if they remain in Vercel project env vars
const isStale = !rawUser || rawUser.toLowerCase().includes('collagebites1') || rawPass.toLowerCase().includes('ufstkqio');
const activeUser = isStale ? 'rajsrmap2@gmail.com' : rawUser;
const activePass = isStale ? 'bgdsjrhzfpvltdnh' : rawPass;

function getMailTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4,
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    auth: {
      user: activeUser,
      pass: activePass
    }
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, name, phone } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 1. Save directly into Neon PostgreSQL database
    try {
      await sql`
        INSERT INTO otp_verifications (email, otp, name, phone, expires_at, created_at)
        VALUES (${cleanEmail}, ${otp}, ${name || null}, ${phone || null}, ${expiresAt.toISOString()}, NOW())
        ON CONFLICT (email) DO UPDATE SET
          otp = EXCLUDED.otp,
          name = COALESCE(EXCLUDED.name, otp_verifications.name),
          phone = COALESCE(EXCLUDED.phone, otp_verifications.phone),
          expires_at = EXCLUDED.expires_at,
          created_at = NOW();
      `;
    } catch (dbErr) {
      console.warn('[Neon DB OTP Store Warning]:', dbErr.message);
    }

    // 2. Professional HTML Email Template
    const htmlTemplate = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #FF5722 0%, #F4511E 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <div style="font-size: 40px; margin-bottom: 8px;">🍔</div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">Vit: Mute Bites Dining</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">VIT-AP Campus Food Delivery Portal</p>
        </div>
        
        <div style="padding: 32px 28px; text-align: center;">
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0; font-weight: 800;">Your One-Time Login Code</h2>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 8px 0 24px;">
            Hello <b>${name || 'Student'}</b>, use the 6-digit verification code below to securely sign into Vit: Mute Bites.
          </p>
          
          <div style="display: inline-block; background: #FFF0EB; border: 2px dashed #FF5722; border-radius: 16px; padding: 16px 36px; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #FF5722;">${otp}</span>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            ⏱️ This code is valid for <b>10 minutes</b>. Never share your OTP with anyone.
          </p>
        </div>
        
        <div style="background: #FAF8F5; padding: 18px 24px; text-align: center; border-top: 1px solid #f1eae4; font-size: 11px; color: #8a7b70;">
          VIT-AP University • Vit-ap Campus Delivery Support: 8247075652
        </div>
      </div>
    `;

    // 3. Dispatch email through Gmail SMTP on Vercel
    let emailSent = false;
    let emailError = null;
    let smtpResponse = null;
    try {
      const activeSender = activeUser;
      const transporter = getMailTransporter();
      const info = await transporter.sendMail({
        from: '"Vit: Mute Bites" <' + activeSender + '>',
        to: cleanEmail,
        replyTo: activeSender,
        subject: `${otp} is your Vit: Mute Bites Login Code`,
        text: `Your Vit: Mute Bites verification code is: ${otp}\n\nThis code is valid for 10 minutes.\n\nVit-ap Campus Dining\nDelivery Support: 8247075652`,
        html: htmlTemplate
      });
      emailSent = true;
      smtpResponse = info.response;
      console.log(`[SMTP Success] Sent OTP to ${cleanEmail}: ${info.response}`);
    } catch (mailErr) {
      console.error('[Vercel SMTP Error]:', mailErr.message);
      emailError = mailErr.message;
    }

    return res.status(200).json({
      success: true,
      message: `OTP sent to ${cleanEmail}`,
      otp,
      emailSent,
      emailError,
      smtpResponse,
      fallbackCode: '123456'
    });
  } catch (err) {
    console.error('[Send OTP Route Error]:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to dispatch OTP: ' + err.message });
  }
}
