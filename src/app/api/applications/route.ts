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
  const ip = requestIp(request);
  const isDev = process.env.NODE_ENV !== 'production';
  const limit = isDev ? 100 : 30;

  if (!(await allowRequest(`application:${ip}`, limit, 60 * 60_000))) {
    console.error('[APPLICATION_SUBMIT_FAILED]', { reason: 'rate_limited', ip });
    return NextResponse.json({ success: false, error: 'rate_limited', message: 'Rate limit exceeded' }, { status: 429 });
  }

  let input: Input;
  try {
    input = (await request.json()) as Input;
  } catch (err) {
    console.error('[APPLICATION_SUBMIT_FAILED]', { reason: 'invalid_json', err });
    return NextResponse.json({ success: false, error: 'invalid_json', message: 'Invalid JSON payload' }, { status: 400 });
  }

  const fullName = text(input, 'full_name', 3, 120);
  const headline = text(input, 'headline', 5, 200);
  const specialties = text(input, 'specialties', 2, 500);
  // Strict requirement: Bio must be at least 100 characters
  const bio = text(input, 'bio', 100, 4_000);
  const telegram = text(input, 'telegram', 2, 80);
  const email = text(input, 'email', 5, 254);
  const phone = text(input, 'phone', 7, 30);

  // Photo is REQUIRED
  const rawPhoto = input.photo_url ? String(input.photo_url).trim() : '';
  const photoUrl = rawPhoto && rawPhoto.length >= 10 && rawPhoto.length <= 1_000 ? rawPhoto : null;
  const photoUrlValid = !!photoUrl && isAllowedAvatarUrl(photoUrl);

  // Proof link is REQUIRED (LinkedIn or any proof)
  const rawProof = input.proof_link ? String(input.proof_link).trim() : '';
  const proofLink = rawProof && rawProof.length >= 3 && rawProof.length <= 500 ? rawProof : null;
  const proofLinkValid = !!proofLink && /^(https?:\/\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/.test(proofLink);

  // Consent checkbox is REQUIRED
  const consentPublished = input.consent_published ? String(input.consent_published) : null;
  const consentValid = !!consentPublished;

  const emailValid = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const failedFields: string[] = [];
  if (!fullName) failedFields.push('full_name');
  if (!headline) failedFields.push('headline');
  if (!specialties) failedFields.push('specialties');
  if (!bio) failedFields.push('bio');
  if (!telegram) failedFields.push('telegram');
  if (!emailValid) failedFields.push('email');
  if (!phone) failedFields.push('phone');
  if (!photoUrlValid) failedFields.push('photo_url');
  if (!proofLinkValid) failedFields.push('proof_link');
  if (!consentValid) failedFields.push('consent_published');

  if (failedFields.length > 0) {
    console.error('[APPLICATION_SUBMIT_FAILED]', {
      reason: 'invalid_input',
      failedFields,
      inputDetails: {
        fullNameLength: typeof input.full_name === 'string' ? input.full_name.length : 0,
        headlineLength: typeof input.headline === 'string' ? input.headline.length : 0,
        bioLength: typeof input.bio === 'string' ? input.bio.length : 0,
        email: input.email,
        phone: input.phone,
        hasPhoto: !!photoUrl,
        hasProofLink: !!proofLink,
        hasConsent: !!consentPublished,
      },
    });
    return NextResponse.json(
      {
        success: false,
        error: 'invalid_input',
        failedFields,
        details: `Validation failed for: ${failedFields.join(', ')}`,
      },
      { status: 400 }
    );
  }

  const baseApplication = {
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
    status: 'pending', // Submissions are always saved with status "pending"
  };

  const fullApplication = {
    ...baseApplication,
    proof_link: proofLink,
    consent_published: consentPublished,
  };

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error('[APPLICATION_SUBMIT_FAILED]', { reason: 'server_misconfigured', err });
    return NextResponse.json({ success: false, error: 'server_misconfigured', details: 'Database connection misconfigured' }, { status: 500 });
  }

  // Attempt insert with full columns; if columns don't exist yet on remote Supabase, fall back to base
  let insertResult = await supabase
    .from('counselor_applications')
    .insert(fullApplication)
    .select('id')
    .single();

  if (
    insertResult.error &&
    (insertResult.error.code === '42703' ||
      insertResult.error.code === 'PGRST204' ||
      insertResult.error.message?.includes('proof_link') ||
      insertResult.error.message?.includes('consent_published') ||
      insertResult.error.message?.includes('column'))
  ) {
    console.warn('[APPLICATION_INSERT_FALLBACK] New columns not found in schema cache, inserting base schema');
    insertResult = await supabase
      .from('counselor_applications')
      .insert(baseApplication)
      .select('id')
      .single();
  }

  const { data, error } = insertResult;
  if (error || !data) {
    console.error('[APPLICATION_SUBMIT_FAILED]', { reason: 'insert_failed', error });
    return NextResponse.json({ success: false, error: 'insert_failed', details: error?.message }, { status: 500 });
  }

  void sendTelegramNotification({
    id: `APP-${data.id}`,
    studentName: `${fullName} (MENTOR ARIZASI)`,
    counselorName: specialties ?? '',
    tier: 'standard',
    price: baseApplication.expected_standard_price ?? 45_000,
    slot: "Arizachi profilini ko'rib chiqish",
    paymentMethod: 'ARIZA',
    phone: phone ?? '',
    telegram: telegram ?? '',
    email: email ?? '',
    education: headline ?? '',
    question: `Bio: ${(bio ?? '').slice(0, 120)}...\nProof: ${proofLink ?? 'N/A'}\nRozilik: ${consentPublished ? 'HA' : "YO'Q"}`,
    meetLink: `${new URL(request.url).origin}/admin`,
  });

  return NextResponse.json({ success: true, id: data.id });
}
