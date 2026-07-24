import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/utils/supabase/server';


export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Supabase-based rate limiting (works across serverless instances)
    const windowStart = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
    const { data: existingLimit } = await supabase
      .from('rate_limits')
      .select('count, window_start')
      .eq('user_id', user.id)
      .eq('action', 'send_email')
      .single();

    if (existingLimit && new Date(existingLimit.window_start) > new Date(windowStart)) {
      if (existingLimit.count >= 5) {
        return NextResponse.json({ error: 'Çok fazla istek. Lütfen 1 dakika bekleyin.' }, { status: 429 });
      }
      await supabase.from('rate_limits').update({ count: existingLimit.count + 1 }).eq('user_id', user.id).eq('action', 'send_email');
    } else {
      await supabase.from('rate_limits').upsert({ user_id: user.id, action: 'send_email', count: 1, window_start: new Date().toISOString() }, { onConflict: 'user_id,action' });
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
  } catch (error) {
    console.error('Email API Error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message || 'Failed to send email' }, { status: 500 });
  }
}


