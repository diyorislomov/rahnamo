import { NextResponse } from 'next/server';
import { resolveMentorFromRequest } from '@/lib/mentorSession';
import { allowRequest } from '@/lib/rateLimit';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { isSameOrigin } from '@/lib/serverSecurity';
import { isAllowedAvatarUrl } from '@/lib/avatarUrl';
import { normalizeSlots } from '@/lib/slots';

const COLUMNS =
  'id, full_name, headline, avatar_url, specialties, bio, standard_price, premium_price, available_slots, why_work_with_me, price_per_question, soft_cap';

export async function GET(request: Request) {
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  if (!(await allowRequest(`mentor-profile:${mentor.authId}`, 120, 15 * 60_000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }
  const { data, error } = await getServiceRoleClient()
    .from('counselors')
    .select(COLUMNS)
    .eq('id', mentor.counselorId)
    .single();
  if (error || !data) return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
  return NextResponse.json({ success: true, counselor: data });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  if (!(await allowRequest(`mentor-profile-update:${mentor.authId}`, 20, 15 * 60_000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const stringValue = (key: string, max: number) =>
    typeof input[key] === 'string' && (input[key] as string).trim().length <= max
      ? (input[key] as string).trim()
      : null;
  const positiveNumber = (key: string, nullable = false) => {
    if (nullable && (input[key] === null || input[key] === '')) return null;
    const value = Number(input[key]);
    return Number.isInteger(value) && value > 0 && value <= 100_000_000 ? value : undefined;
  };
  const headline = stringValue('headline', 200);
  const bio = stringValue('bio', 4_000);
  const whyWorkWithMe = stringValue('why_work_with_me', 2_000);
  const avatarUrl = stringValue('avatar_url', 1_000);
  const standardPrice = positiveNumber('standard_price');
  const premiumPrice = positiveNumber('premium_price');
  const pricePerQuestion = positiveNumber('price_per_question', true);
  const softCap = positiveNumber('soft_cap', true);
  const specialties = Array.isArray(input.specialties)
    ? input.specialties.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 20)
    : null;
  const availableSlots = Array.isArray(input.available_slots)
    ? normalizeSlots(input.available_slots.filter((value): value is string => typeof value === 'string')).slice(0, 50)
    : null;

  if (
    !headline ||
    !bio ||
    !avatarUrl ||
    !isAllowedAvatarUrl(avatarUrl) ||
    standardPrice === undefined ||
    premiumPrice === undefined ||
    pricePerQuestion === undefined ||
    softCap === undefined ||
    !specialties ||
    specialties.some((value) => value.length > 100) ||
    !availableSlots ||
    availableSlots.some((value) => value.length > 200)
  ) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const { data, error } = await getServiceRoleClient()
    .from('counselors')
    .update({
      headline,
      bio,
      why_work_with_me: whyWorkWithMe || null,
      specialties,
      standard_price: standardPrice,
      premium_price: premiumPrice,
      price_per_question: pricePerQuestion,
      soft_cap: softCap,
      available_slots: availableSlots,
      avatar_url: avatarUrl,
    })
    .eq('id', mentor.counselorId)
    .select('id')
    .single();
  if (error || !data) return NextResponse.json({ success: false, error: 'update_failed' }, { status: 500 });
  return NextResponse.json({ success: true });
}
