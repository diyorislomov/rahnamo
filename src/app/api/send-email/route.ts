import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { defaultLocale, isValidLocale } from '@/i18n/config';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { resolveMenteeFromRequest } from '@/lib/menteeSession';
import { allowRequest, requestIp } from '@/lib/rateLimit';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';

interface EmailRequestBody {
  kind?: 'booking_created' | 'payment_confirmed';
  id?: string;
}

interface BookingEmailData {
  id: string;
  studentName: string;
  counselorName: string;
  tier: string;
  price: number;
  slot: string;
  paymentMethod?: string;
  email: string;
  meetLink?: string;
  // Captured on the student's own browser at booking time and stored on
  // the row -- NOT read from this request's own cookie. The
  // payment_confirmed email is sent from the ADMIN's browser session,
  // often much later, so a cookie here would reflect the admin's language,
  // not the student's. See src/i18n/request.ts for the matching override.
  locale?: string;
}

type EmailTranslator = Awaited<ReturnType<typeof getTranslations<'emails'>>>;
type CommonTranslator = Awaited<ReturnType<typeof getTranslations<'common'>>>;

const WRAPPER_OPEN = (title: string, subtitle: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; background-color: #faf6ee; color: #2c241e;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="font-family: serif; color: #451a03; margin: 0;">${title}</h2>
      <p style="font-size: 12px; color: #78350f;">${subtitle}</p>
    </div>
`;
const WRAPPER_CLOSE = (t: EmailTranslator) => `
    <p style="font-size: 11px; color: #78716c; margin-top: 24px; text-align: center;">
      ${t('footerNote')}
    </p>
  </div>
`;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const DETAILS_BOX = (
  t: EmailTranslator,
  tCommon: CommonTranslator,
  opts: {
    id: string;
    studentName: string;
    counselorName: string;
    slot: string;
    tier: string;
    price: number;
    paymentMethod?: string;
  }
) => {
  const tierLabel = opts.tier === 'standard' || opts.tier === 'premium' ? tCommon(opts.tier) : opts.tier;
  return `
  <div style="background-color: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #fde68a;">
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.ticketId')}</strong> ${escapeHtml(opts.id)}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.student')}</strong> ${escapeHtml(opts.studentName)}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.counselor')}</strong> ${escapeHtml(opts.counselorName)}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.scheduledTime')}</strong> ${escapeHtml(opts.slot)}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.packageAndPayment')}</strong> ${escapeHtml(tierLabel.toUpperCase())} (${opts.price.toLocaleString()} UZS${
    opts.paymentMethod ? ` via ${escapeHtml(opts.paymentMethod.toUpperCase())}` : ''
  })</p>
  </div>
`;
};

// The real link -- only ever included in this one template, once an admin
// has actually verified the payment proof. The booking-created email below
// deliberately never includes it.
const MEET_LINK_BOX = (t: EmailTranslator, meetLink: string) => `
  <div style="background-color: #d1fae5; border-radius: 12px; padding: 16px; color: #065f46; font-size: 13px;">
    <p style="margin: 0 0 8px 0;"><strong>${t('meetLink.label')}</strong></p>
    <a href="${escapeHtml(meetLink)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #047857; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 13px;">
      ${t('meetLink.button')}
    </a>
    <p style="margin: 10px 0 0 0;">${t('meetLink.reminder')}</p>
  </div>
`;

const PENDING_PAYMENT_BOX = (t: EmailTranslator) => `
  <div style="background-color: #fef3c7; border-radius: 12px; padding: 16px; color: #78350f; font-size: 13px;">
    <p style="margin: 0;">${t('pendingPayment')}</p>
  </div>
`;

function buildBookingCreatedEmail(t: EmailTranslator, tCommon: CommonTranslator, body: BookingEmailData) {
  const { id, studentName, counselorName, tier, price, slot, paymentMethod } = body;
  return {
    subject: t('bookingCreated.subject', { id }),
    html:
      WRAPPER_OPEN(t('bookingCreated.title'), t('bookingCreated.subtitle')) +
      DETAILS_BOX(t, tCommon, { id, studentName, counselorName, slot, tier, price, paymentMethod }) +
      PENDING_PAYMENT_BOX(t) +
      WRAPPER_CLOSE(t),
  };
}

function buildPaymentConfirmedEmail(t: EmailTranslator, tCommon: CommonTranslator, body: BookingEmailData) {
  const { id, studentName, counselorName, tier, price, slot, paymentMethod, meetLink } = body;
  return {
    subject: t('paymentConfirmed.subject', { id }),
    html:
      WRAPPER_OPEN(t('paymentConfirmed.title'), t('paymentConfirmed.subtitle')) +
      DETAILS_BOX(t, tCommon, { id, studentName, counselorName, slot, tier, price, paymentMethod }) +
      MEET_LINK_BOX(t, meetLink ?? '') +
      WRAPPER_CLOSE(t),
  };
}

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
    }
    if (!(await allowRequest(`email:${requestIp(request)}`, 20, 10 * 60_000))) {
      return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
    }

    const input: EmailRequestBody = await request.json();
    const { kind = 'booking_created', id } = input;
    if (typeof id !== 'string' || !['booking_created', 'payment_confirmed'].includes(kind)) {
      return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
    }

    const bookingResult = await postgres.query('SELECT * FROM bookings WHERE id = $1', [id]);
    const booking = bookingResult.rows[0];
    if (!booking) {
      return NextResponse.json({ success: false, error: 'booking_not_found' }, { status: 404 });
    }

    if (kind === 'booking_created') {
      const mentee = await resolveMenteeFromRequest(request);
      if (!mentee || booking.user_id !== mentee.userId) {
        return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
      }
    } else {
      const cookieStore = await cookies();
      const isAdmin = verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
      if (!isAdmin || booking.payment_status !== 'confirmed') {
        return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
      }
      if (typeof booking.meet_link !== 'string' || !/^https:\/\/meet\.jit\.si\/[A-Za-z0-9_-]+$/.test(booking.meet_link)) {
        return NextResponse.json({ success: false, error: 'invalid_meet_link' }, { status: 409 });
      }
    }

    const body: BookingEmailData = {
      id: booking.id,
      studentName: booking.student_name,
      counselorName: booking.counselor_name,
      tier: booking.tier,
      price: booking.price,
      slot: booking.slot,
      paymentMethod: booking.payment_method,
      email: booking.email,
      meetLink: booking.meet_link,
      locale: booking.locale,
    };
    const { email, locale: rawLocale } = body;
    const locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey || resendApiKey.includes('placeholder')) {
      return NextResponse.json({
        success: false,
        message: 'Resend API key not configured yet.',
      }, { status: 500 });
    }

    const [t, tCommon] = await Promise.all([
      getTranslations({ locale, namespace: 'emails' }),
      getTranslations({ locale, namespace: 'common' }),
    ]);

    const { subject, html } =
      kind === 'payment_confirmed' ? buildPaymentConfirmedEmail(t, tCommon, body) : buildBookingCreatedEmail(t, tCommon, body);

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
