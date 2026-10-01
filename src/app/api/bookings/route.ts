import { NextResponse } from 'next/server';
import { generateMeetLink } from '@/lib/meeting';
import { resolveMenteeFromRequest } from '@/lib/menteeSession';
import { allowRequest, requestIp } from '@/lib/rateLimit';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { sendTelegramNotification } from '@/lib/telegram';
import { isValidLocale } from '@/i18n/config';

type BookingInput = {
  counselorId?: unknown;
  tier?: unknown;
  paymentMethod?: unknown;
  slot?: unknown;
  studentName?: unknown;
  phone?: unknown;
  telegram?: unknown;
  education?: unknown;
  question?: unknown;
  paymentReceipt?: unknown;
  locale?: unknown;
};

const METHODS = new Set(['payme', 'click', 'uzum']);
const TIERS = new Set(['standard', 'premium']);

function textValue(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean.length >= min && clean.length <= max ? clean : null;
}

export async function POST(request: Request) {
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
  const paymentMethod =
    typeof body.paymentMethod === 'string' && METHODS.has(body.paymentMethod) ? body.paymentMethod : null;
  const slot = textValue(body.slot, 1, 200);
  const studentName = textValue(body.studentName, 3, 120);
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
    !slot ||
    !studentName ||
    !phone ||
    !telegram ||
    !education ||
    !question ||
    !paymentReceipt ||
    !mentee.email
  ) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch {
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
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

  const { data: occupied } = await supabase
    .from('bookings')
    .select('id')
    .eq('counselor_id', counselorId)
    .eq('slot', slot)
    .eq('status', 'confirmed')
    .limit(1);
  if (occupied && occupied.length > 0) {
    return NextResponse.json({ success: false, error: 'slot_unavailable' }, { status: 409 });
  }

  const id = `RNM-${crypto.randomUUID()}`;
  const price = tier === 'standard' ? counselor.standard_price : counselor.premium_price;
  const meetLink = generateMeetLink(id);
  const row = {
    id,
    device_id: `auth-${mentee.userId}`,
    mentee_auth_id: mentee.userId,
    counselor_id: counselor.id,
    counselor_name: counselor.full_name,
    counselor_headline: counselor.headline,
    counselor_avatar: counselor.avatar_url,
    tier,
    price,
    payment_method: paymentMethod,
    payment_receipt: paymentReceipt,
    slot,
    student_name: studentName,
    email: mentee.email,
    phone,
    telegram,
    education,
    question,
    meet_link: meetLink,
    locale,
  };

  const { data: inserted, error } = await supabase.from('bookings').insert(row).select('*').single();
  if (error || !inserted) {
    const conflict = error?.code === '23505';
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
    email: mentee.email,
    education,
    question,
    meetLink,
  });

  return NextResponse.json({ success: true, booking: inserted });
}
