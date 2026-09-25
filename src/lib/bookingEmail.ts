import 'server-only';
import { getTranslations } from 'next-intl/server';
import { defaultLocale, isValidLocale } from '@/i18n/config';

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
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.ticketId')}</strong> ${opts.id}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.student')}</strong> ${opts.studentName}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.counselor')}</strong> ${opts.counselorName}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.scheduledTime')}</strong> ${opts.slot}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.packageAndPayment')}</strong> ${tierLabel.toUpperCase()} (${opts.price.toLocaleString()} UZS${
    opts.paymentMethod ? ` via ${opts.paymentMethod.toUpperCase()}` : ''
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
    <a href="${meetLink}" target="_blank" style="display: inline-block; background-color: #047857; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 13px;">
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

function buildBookingCreatedEmail(t: EmailTranslator, tCommon: CommonTranslator, body: EmailRequestBody) {
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

function buildPaymentConfirmedEmail(t: EmailTranslator, tCommon: CommonTranslator, body: EmailRequestBody) {
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export async function sendBookingEmail(input: EmailRequestBody): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !input.email) return false;
  const kind = input.kind || 'booking_created';
  const locale = isValidLocale(input.locale) ? input.locale : defaultLocale;
  const body = { ...input, id: escapeHtml(input.id), studentName: escapeHtml(input.studentName), counselorName: escapeHtml(input.counselorName), slot: escapeHtml(input.slot), tier: escapeHtml(input.tier), paymentMethod: escapeHtml(input.paymentMethod || '') };
  if (kind === 'payment_confirmed') {
    try { const url = new URL(input.meetLink || ''); if (url.protocol !== 'https:' || url.hostname !== 'meet.jit.si') return false; body.meetLink = escapeHtml(url.href); } catch { return false; }
  }
  try {
    const [t, common] = await Promise.all([getTranslations({locale, namespace:'emails'}), getTranslations({locale, namespace:'common'})]);
    const message = kind === 'payment_confirmed' ? buildPaymentConfirmedEmail(t, common, body) : buildBookingCreatedEmail(t, common, body);
    const response = await fetch('https://api.resend.com/emails', {
      method:'POST', signal: AbortSignal.timeout(8000),
      headers:{Authorization:`Bearer ${key}`, 'Content-Type':'application/json', 'Idempotency-Key':`rahnamo/${kind}/${input.id}`},
      body: JSON.stringify({from:process.env.RESEND_FROM_EMAIL || 'Rahnamo <noreply@myrahnamo.com>',to:[input.email],...message}),
    });
    return response.ok;
  } catch { return false; }
}
