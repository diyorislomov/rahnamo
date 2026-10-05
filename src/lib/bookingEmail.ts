import 'server-only';

import { getTranslations } from 'next-intl/server';
import { defaultLocale, isValidLocale } from '@/i18n/config';
import { postgres } from '@/lib/postgres';

export type BookingEmailKind = 'booking_created' | 'payment_confirmed';

type BookingRow = {
  id: string;
  student_name: string;
  counselor_name: string;
  tier: string;
  price: number;
  slot: string;
  payment_method?: string;
  email: string;
  meet_link?: string;
  locale?: string;
};

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
    <p style="font-size: 11px; color: #78716c; margin-top: 24px; text-align: center;">${t('footerNote')}</p>
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

function detailsBox(t: EmailTranslator, tCommon: CommonTranslator, booking: BookingRow) {
  const tierLabel = booking.tier === 'standard' || booking.tier === 'premium' ? tCommon(booking.tier) : booking.tier;
  return `
  <div style="background-color: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #fde68a;">
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.ticketId')}</strong> ${escapeHtml(booking.id)}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.student')}</strong> ${escapeHtml(booking.student_name)}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.counselor')}</strong> ${escapeHtml(booking.counselor_name)}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.scheduledTime')}</strong> ${escapeHtml(booking.slot)}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>${t('details.packageAndPayment')}</strong> ${escapeHtml(tierLabel.toUpperCase())} (${booking.price.toLocaleString()} UZS${booking.payment_method ? ` via ${escapeHtml(booking.payment_method.toUpperCase())}` : ''})</p>
  </div>
`;
}

function pendingPaymentBox(t: EmailTranslator) {
  return `<div style="background-color: #fef3c7; border-radius: 12px; padding: 16px; color: #78350f; font-size: 13px;"><p style="margin: 0;">${t('pendingPayment')}</p></div>`;
}

function meetLinkBox(t: EmailTranslator, meetLink: string) {
  return `
  <div style="background-color: #d1fae5; border-radius: 12px; padding: 16px; color: #065f46; font-size: 13px;">
    <p style="margin: 0 0 8px 0;"><strong>${t('meetLink.label')}</strong></p>
    <a href="${escapeHtml(meetLink)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #047857; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 13px;">${t('meetLink.button')}</a>
    <p style="margin: 10px 0 0 0;">${t('meetLink.reminder')}</p>
  </div>
`;
}

export async function sendBookingEmailById(kind: BookingEmailKind, bookingId: string) {
  const result = await postgres.query<BookingRow>('SELECT * FROM bookings WHERE id = $1', [bookingId]);
  const booking = result.rows[0];
  if (!booking) return { success: false, error: 'booking_not_found' };
  if (kind === 'payment_confirmed' && !/^https:\/\/meet\.jit\.si\/[A-Za-z0-9_-]+$/.test(booking.meet_link || '')) {
    return { success: false, error: 'invalid_meet_link' };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey || resendApiKey.includes('placeholder')) {
    return { success: false, error: 'email_not_configured' };
  }

  const locale = isValidLocale(booking.locale) ? booking.locale : defaultLocale;
  const [t, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: 'emails' }),
    getTranslations({ locale, namespace: 'common' }),
  ]);
  const subject = kind === 'payment_confirmed'
    ? t('paymentConfirmed.subject', { id: booking.id })
    : t('bookingCreated.subject', { id: booking.id });
  const title = kind === 'payment_confirmed' ? t('paymentConfirmed.title') : t('bookingCreated.title');
  const subtitle = kind === 'payment_confirmed' ? t('paymentConfirmed.subtitle') : t('bookingCreated.subtitle');
  const content = kind === 'payment_confirmed' ? meetLinkBox(t, booking.meet_link || '') : pendingPaymentBox(t);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Rahnamo <noreply@myrahnamo.com>',
      to: [booking.email],
      subject,
      html: WRAPPER_OPEN(title, subtitle) + detailsBox(t, tCommon, booking) + content + WRAPPER_CLOSE(t),
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) console.warn('[RESEND_SEND_FAILED]', data);
  return { success: response.ok, data };
}

