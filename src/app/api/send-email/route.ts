import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/utils/supabase/server';

// Rate limiting cache (memory-based for serverless instance)
const rateLimit = new Map<string, { count: number, resetTime: number }>();

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limiting: Max 5 emails per minute per user
    const now = Date.now();
    const userRate = rateLimit.get(user.id);
    if (userRate && now < userRate.resetTime) {
      if (userRate.count >= 5) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
      userRate.count++;
    } else {
      rateLimit.set(user.id, { count: 1, resetTime: now + 60000 });
    }

    // Role-based Authorization
    const { data: userData, error: userDbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDbError || !userData) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    const allowedRoles = ['general_admin', 'region_manager', 'unit_head', 'rep_head', 'rep_region_manager', 'rep_coordinator'];
    if (!allowedRoles.includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role' }, { status: 403 });
    }

    const body = await request.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Basic email format validation
    const emailList = to.split(',').map((e: string) => e.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailList.every((e: string) => emailRegex.test(e))) {
      return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Cansağlığı Etkinlik Sistemi" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Email API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
