import { NextResponse } from 'next/server';

interface EmailRequestBody {
  kind?: 'booking_created' | 'payment_confirmed';
  id: string;
  studentName: string;
  counselorName: string;
  tier: string;
  price: number;
  slot: string;
  paymentMethod?: string;
  email: string;
  meetLink?: string;
}

const WRAPPER_OPEN = (title: string, subtitle: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; background-color: #faf6ee; color: #2c241e;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="font-family: serif; color: #451a03; margin: 0;">${title}</h2>
      <p style="font-size: 12px; color: #78350f;">${subtitle}</p>
    </div>
`;
const WRAPPER_CLOSE = `
    <p style="font-size: 11px; color: #78716c; margin-top: 24px; text-align: center;">
      Savollaringiz bo'lsa @rahnamo_admin ga murojaat qiling.
    </p>
  </div>
`;

const DETAILS_BOX = (opts: {
  id: string;
  studentName: string;
  counselorName: string;
  slot: string;
  tier: string;
  price: number;
  paymentMethod?: string;
}) => `
  <div style="background-color: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #fde68a;">
    <p style="margin: 4px 0; font-size: 14px;"><strong>Chipta ID:</strong> ${opts.id}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>Talaba:</strong> ${opts.studentName}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>Rahnamo:</strong> ${opts.counselorName}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>Belgilangan vaqt:</strong> ${opts.slot}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>Paket & To'lov:</strong> ${opts.tier.toUpperCase()} (${opts.price.toLocaleString()} UZS${
  opts.paymentMethod ? ` via ${opts.paymentMethod.toUpperCase()}` : ''
})</p>
  </div>
`;

// The real link -- only ever included in this one template, once an admin
// has actually verified the payment proof. The booking-created email below
// deliberately never includes it.
const MEET_LINK_BOX = (meetLink: string) => `
  <div style="background-color: #d1fae5; border-radius: 12px; padding: 16px; color: #065f46; font-size: 13px;">
    <p style="margin: 0 0 8px 0;"><strong>🔗 Video Uchrashuv Havolasi:</strong></p>
    <a href="${meetLink}" target="_blank" style="display: inline-block; background-color: #047857; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 13px;">
      Video Xonasiga Kirish
    </a>
    <p style="margin: 10px 0 0 0;">Uchrashuv boshlanishidan 10 daqiqa oldin xonaga ulanishingiz so'raladi.</p>
  </div>
`;

const PENDING_PAYMENT_BOX = `
  <div style="background-color: #fef3c7; border-radius: 12px; padding: 16px; color: #78350f; font-size: 13px;">
    <p style="margin: 0;"><strong>⏳ To'lov tekshirilmoqda.</strong> Video uchrashuv havolasi to'lovingiz tasdiqlangandan so'ng shu manzilga va "Mening qabullarim" sahifasiga yuboriladi.</p>
  </div>
`;

function buildBookingCreatedEmail(body: EmailRequestBody) {
  const { id, studentName, counselorName, tier, price, slot, paymentMethod } = body;
  return {
    subject: `[Rahnamo] Qabul Tasdiqlandi — Chipta ${id}`,
    html:
      WRAPPER_OPEN('🐪 Rahnamo — Qabul Tasdiqlandi', 'Rasmiy 1-ga-1 konsultatsiya chiptasi') +
      DETAILS_BOX({ id, studentName, counselorName, slot, tier, price, paymentMethod }) +
      PENDING_PAYMENT_BOX +
      WRAPPER_CLOSE,
  };
}

function buildPaymentConfirmedEmail(body: EmailRequestBody) {
  const { id, studentName, counselorName, tier, price, slot, paymentMethod, meetLink } = body;
  return {
    subject: `[Rahnamo] To'lovingiz tasdiqlandi — Sessiya ${id}`,
    html:
      WRAPPER_OPEN("✅ Rahnamo — To'lov Tasdiqlandi", 'Sessiyangiz endi rasman belgilandi') +
      DETAILS_BOX({ id, studentName, counselorName, slot, tier, price, paymentMethod }) +
      MEET_LINK_BOX(meetLink ?? '') +
      WRAPPER_CLOSE,
  };
}

export async function POST(request: Request) {
  try {
    const body: EmailRequestBody = await request.json();
    const { kind = 'booking_created', email } = body;

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey || resendApiKey.includes('placeholder')) {
      console.log('[Email Receipt Logged - Add RESEND_API_KEY to send real emails]:', body);
      return NextResponse.json({
        success: false,
        message: 'Resend API key not configured yet.',
      });
    }

    const { subject, html } =
      kind === 'payment_confirmed' ? buildPaymentConfirmedEmail(body) : buildBookingCreatedEmail(body);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Rahnamo <noreply@myrahnamo.com>',
        to: [email],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.warn('[Resend Send Error]:', data?.message ?? data);
    }

    return NextResponse.json({ success: res.ok, data });
  } catch (error) {
    console.error('Email API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
