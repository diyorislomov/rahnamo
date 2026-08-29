import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, studentName, counselorName, tier, price, slot, paymentMethod, email, telegram, question, meetLink } = body;

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey || resendApiKey.includes('placeholder')) {
      console.log('[Email Receipt Logged - Add RESEND_API_KEY to send real emails]:', body);
      return NextResponse.json({
        success: false,
        message: 'Resend API key not configured yet.',
      });
    }

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; background-color: #faf6ee; color: #2c241e;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-family: serif; color: #451a03; margin: 0;">🐪 Rahnamo — Qabul Tasdiqlandi</h2>
          <p style="font-size: 12px; color: #78350f;">Rasmiy 1-ga-1 konsultatsiya chiptasi</p>
        </div>

        <div style="background-color: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #fde68a;">
          <p style="margin: 4px 0; font-size: 14px;"><strong>Chipta ID:</strong> ${id}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Talaba:</strong> ${studentName}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Rahnamo:</strong> ${counselorName}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Belgilangan vaqt:</strong> ${slot}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Paket & To'lov:</strong> ${tier.toUpperCase()} (${price.toLocaleString()} UZS via ${paymentMethod.toUpperCase()})</p>
        </div>

        <div style="background-color: #d1fae5; border-radius: 12px; padding: 16px; color: #065f46; font-size: 13px;">
          <p style="margin: 0 0 8px 0;"><strong>🔗 Video Uchrashuv Havolasi:</strong></p>
          <a href="${meetLink}" target="_blank" style="display: inline-block; background-color: #047857; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 13px;">
            Google Meet Xonasiga Kirish
          </a>
        </div>

        <p style="font-size: 11px; color: #78716c; margin-top: 24px; text-align: center;">
          Uchrashuv boshlanishidan 10 daqiqa oldin xonaga ulanishingiz so'raladi. Savollaringiz bo'lsa @rahnamo_admin ga murojaat qiling.
        </p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Rahnamo <onboarding@resend.dev>',
        to: [email],
        subject: `[Rahnamo] Qabul Tasdiqlandi — Chipta ${id}`,
        html: htmlContent,
      }),
    });

    const data = await res.json();
    
    // If sending to external email fails because of onboarding@resend.dev domain restriction
    if (!res.ok && data?.message?.includes('onboarding@resend.dev')) {
      console.warn('[Resend Domain Warning]: onboarding@resend.dev can only send to your own registered email until custom domain (rahnamo.uz) is verified in Resend.');
    }

    return NextResponse.json({ success: res.ok, data });
  } catch (error: any) {
    console.error('Email API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
