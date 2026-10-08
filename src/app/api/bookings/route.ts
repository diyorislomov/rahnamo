import { NextResponse } from 'next/server';
import { generateMeetLink } from '@/lib/meeting';
import { resolveMenteeFromRequest } from '@/lib/menteeSession';
import { allowRequest, requestIp } from '@/lib/rateLimit';
import { postgres } from '@/lib/postgres';
import { supabase } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';
import { isValidLocale } from '@/i18n/config';
import { isFutureSlot } from '@/lib/slots';
import { isSameOrigin } from '@/lib/serverSecurity';
import { clickPaymentUrl } from '@/lib/click';

type BookingInput = {
  counselorId?: unknown;
  tier?: unknown;
  serviceId?: unknown;
  paymentMethod?: unknown;
  slot?: unknown;
  studentName?: unknown;
  email?: unknown;
  phone?: unknown;
  telegram?: unknown;
  education?: unknown;
  question?: unknown;
  paymentReceipt?: unknown;
  locale?: unknown;
};

const METHODS = new Set(['payme', 'click', 'uzum']);
const TIERS = new Set(['standard', 'premium', 'service']);

function textValue(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean.length >= min && clean.length <= max ? clean : null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  }
  const mentee = await resolveMenteeFromRequest(request);
  if (!mentee) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });

  if (!(await allowRequest(`booking:${mentee.userId}:${requestIp(request)}`, 8, 10 * 60_000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let body: BookingInput;
  try {
    body = (await request.json()) as BookingInput;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const counselorId = textValue(body.counselorId, 1, 100);
  const tier = typeof body.tier === 'string' && TIERS.has(body.tier) ? body.tier : null;
  const serviceId = textValue(body.serviceId, 1, 100);
  const paymentMethod =
    typeof body.paymentMethod === 'string' && METHODS.has(body.paymentMethod) ? body.paymentMethod : null;
  const slot = textValue(body.slot, 1, 200);
  const studentName = textValue(body.studentName, 3, 120);
  const email = textValue(body.email, 3, 254);
  const phone = textValue(body.phone, 7, 30);
  const telegram = textValue(body.telegram, 2, 80);
  const education = textValue(body.education, 1, 300);
  const question = textValue(body.question, 5, 2_000);
  const paymentReceipt = textValue(body.paymentReceipt, 3, 200);
  const locale = typeof body.locale === 'string' && isValidLocale(body.locale) ? body.locale : 'uz';

  if (
    !counselorId ||
    !tier ||
    !paymentMethod ||
    (tier === 'service' && !serviceId) ||
    !slot ||
    !studentName ||
    !phone ||
    !telegram ||
    !education ||
    !question ||
    (paymentMethod !== 'click' && !paymentReceipt) ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !isFutureSlot(slot)
  ) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const { data: counselor, error: counselorError } = await supabase
    .from('counselors')
    .select(
      'id, full_name, headline, avatar_url, standard_price, premium_price, available_slots'
    )
    .eq('id', counselorId)
    .maybeSingle();

  if (counselorError || !counselor) {
    return NextResponse.json({ success: false, error: 'counselor_not_found' }, { status: 404 });
  }
  if (!Array.isArray(counselor.available_slots) || !counselor.available_slots.includes(slot)) {
    return NextResponse.json({ success: false, error: 'slot_unavailable' }, { status: 409 });
  }

  let service: { id: string; title: string; duration_minutes: number; price: number } | null = null;
  if (tier === 'service' && serviceId) {
    const serviceResult = await postgres.query<{ id: string; title: string; duration_minutes: number; price: number }>(
      `SELECT id, title, duration_minutes, price FROM counselor_services
       WHERE id = $1 AND counselor_id = $2 AND active = true`,
      [serviceId, counselorId]
    );
    service = serviceResult.rows[0] || null;
    if (!service) {
      return NextResponse.json({ success: false, error: 'service_unavailable' }, { status: 409 });
    }
  }

  const occupied = await postgres.query(
    `SELECT id FROM bookings
     WHERE counselor_id = $1 AND slot = $2 AND status = 'confirmed'
     LIMIT 1`,
    [counselorId, slot]
  );
  if ((occupied.rowCount ?? 0) > 0) {
    return NextResponse.json({ success: false, error: 'slot_unavailable' }, { status: 409 });
  }

  const id = `RNM-${crypto.randomUUID()}`;
  const price = service?.price ?? (tier === 'standard' ? counselor.standard_price : counselor.premium_price);
  const meetLink = generateMeetLink(id);
  let paymentUrl: string | undefined;
  if (paymentMethod === 'click') {
    try {
      paymentUrl = clickPaymentUrl({
        bookingId: id,
        amount: price,
        returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/my-bookings?payment=click&booking=${encodeURIComponent(id)}`,
      });
    } catch (error) {
      console.error('[CLICK_CHECKOUT_CONFIG_FAILED]', error);
      return NextResponse.json({ success: false, error: 'payment_not_configured' }, { status: 503 });
    }
  }
  let inserted;
  try {
    const result = await postgres.query(
      `INSERT INTO bookings (
         id, user_id, counselor_id, counselor_name, counselor_headline,
         counselor_avatar, tier, service_id, service_title, duration_minutes,
         price, payment_method, payment_receipt, slot, student_name, email,
         phone, telegram, education, question, meet_link, locale
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
       ) RETURNING *`,
      [
        id, mentee.userId, counselor.id, counselor.full_name, counselor.headline,
        counselor.avatar_url, tier, service?.id ?? null, service?.title ?? null,
        service?.duration_minutes ?? null, price, paymentMethod, paymentReceipt,
        slot, studentName, email, phone, telegram, education, question, meetLink, locale,
      ]
    );
    inserted = result.rows[0];
  } catch (error) {
    console.error('[BOOKING_INSERT_FAILED]', error);
    const conflict = Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
    return NextResponse.json(
      { success: false, error: conflict ? 'slot_unavailable' : 'insert_failed' },
      { status: conflict ? 409 : 500 }
    );
  }

  void sendTelegramNotification({
    id,
    studentName,
    counselorName: counselor.full_name,
    tier,
    price,
    slot,
    paymentMethod,
    phone,
    telegram,
    email,
    education,
    question,
    meetLink,
  });

  return NextResponse.json({ success: true, booking: inserted, paymentUrl });
}

export async function GET(request: Request) {
  const mentee = await resolveMenteeFromRequest(request);
  if (!mentee) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });

  const [bookings, reviews] = await Promise.all([
    postgres.query('SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC', [mentee.userId]),
    postgres.query('SELECT booking_id FROM reviews WHERE user_id = $1', [mentee.userId]),
  ]);
  return NextResponse.json({
    success: true,
    bookings: bookings.rows,
    reviewedBookingIds: reviews.rows.map((row: { booking_id: string }) => row.booking_id),
  });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  }
  const mentee = await resolveMenteeFromRequest(request);
  if (!mentee) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  if (!(await allowRequest(`booking-update:${mentee.userId}:${requestIp(request)}`, 12, 10 * 60_000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const id = textValue(input.id, 1, 100);
  const action = input.action;
  if (!id || (action !== 'cancel' && action !== 'reschedule')) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  if (action === 'cancel') {
    const result = await postgres.query(
      `UPDATE bookings SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND status = 'confirmed' AND payment_status = 'pending'
       RETURNING *`,
      [id, mentee.userId]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'booking_not_changeable' }, { status: 409 });
    }
    return NextResponse.json({ success: true, booking: result.rows[0] });
  }

  const slot = textValue(input.slot, 1, 200);
  if (!slot || !isFutureSlot(slot)) {
    return NextResponse.json({ success: false, error: 'invalid_slot' }, { status: 400 });
  }
  const existing = await postgres.query<{ counselor_id: string }>(
    `SELECT counselor_id FROM bookings
     WHERE id = $1 AND user_id = $2 AND status = 'confirmed' AND payment_status = 'pending'`,
    [id, mentee.userId]
  );
  const booking = existing.rows[0];
  if (!booking) {
    return NextResponse.json({ success: false, error: 'booking_not_changeable' }, { status: 409 });
  }
  const { data: counselor, error } = await supabase
    .from('counselors')
    .select('available_slots')
    .eq('id', booking.counselor_id)
    .maybeSingle();
  if (error || !counselor || !Array.isArray(counselor.available_slots) || !counselor.available_slots.includes(slot)) {
    return NextResponse.json({ success: false, error: 'slot_unavailable' }, { status: 409 });
  }

  try {
    const result = await postgres.query(
      `UPDATE bookings SET slot = $1
       WHERE id = $2 AND user_id = $3 AND status = 'confirmed' AND payment_status = 'pending'
       RETURNING *`,
      [slot, id, mentee.userId]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'booking_not_changeable' }, { status: 409 });
    }
    return NextResponse.json({ success: true, booking: result.rows[0] });
  } catch (error) {
    const conflict = Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
    return NextResponse.json(
      { success: false, error: conflict ? 'slot_unavailable' : 'update_failed' },
      { status: conflict ? 409 : 500 }
    );
  }
}
