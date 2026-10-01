import { NextResponse } from 'next/server';
import { allowRequest, requestIp } from '@/lib/rateLimit';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { sendTelegramNotification } from '@/lib/telegram';
import { isAllowedAvatarUrl } from '@/lib/avatarUrl';

type Input = Record<string, unknown>;
function text(input: Input, key: string, min: number, max: number): string | null {
  const value = input[key];
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean.length >= min && clean.length <= max ? clean : null;
}
function positiveInteger(value: unknown, fallback: number | null): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100_000_000 ? parsed : fallback;
}

export async function POST(request: Request) {
  if (!(await allowRequest(`application:${requestIp(request)}`, 3, 24 * 60 * 60_000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }
  let input: Input;
  try {
    input = (await request.json()) as Input;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const fullName = text(input, 'full_name', 3, 120);
  const headline = text(input, 'headline', 5, 200);
  const specialties = text(input, 'specialties', 2, 500);
  const bio = text(input, 'bio', 20, 4_000);
  const telegram = text(input, 'telegram', 2, 80);
  const email = text(input, 'email', 5, 254);
  const phone = text(input, 'phone', 7, 30);
  const photoUrl = text(input, 'photo_url', 10, 1_000);
  const emailValid = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const photoUrlValid = !photoUrl || isAllowedAvatarUrl(photoUrl);
  if (!fullName || !headline || !specialties || !bio || !telegram || !emailValid || !phone || !photoUrlValid) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const application = {
    full_name: fullName,
    headline,
    specialties,
    bio,
    telegram,
    email,
    phone,
    expected_standard_price: positiveInteger(input.expected_standard_price, 45_000),
    expected_premium_price: positiveInteger(input.expected_premium_price, 130_000),
    expected_price_per_question: positiveInteger(input.expected_price_per_question, null),
    expected_soft_cap: positiveInteger(input.expected_soft_cap, null),
    photo_url: photoUrl,
  };

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch {
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }
  const { data, error } = await supabase
    .from('counselor_applications')
    .insert(application)
    .select('id')
    .single();
  if (error || !data) {
    return NextResponse.json({ success: false, error: 'insert_failed' }, { status: 500 });
  }

  void sendTelegramNotification({
    id: `APP-${data.id}`,
    studentName: `${fullName} (MENTOR ARIZASI)`,
    counselorName: specialties,
    tier: 'standard',
    price: application.expected_standard_price ?? 45_000,
    slot: "Arizachi profilini ko'rib chiqish",
    paymentMethod: 'ARIZA',
    phone,
    telegram,
    email,
    education: headline,
    question: `Bio: ${bio.slice(0, 120)}...`,
    meetLink: `${new URL(request.url).origin}/admin`,
  });

  return NextResponse.json({ success: true, id: data.id });
}
