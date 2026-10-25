import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';
import { isValidLocale } from '@/i18n/config';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const currentLocale = cookieStore.get('NEXT_LOCALE')?.value || 'uz';

  let pgUser: { id: string; name: string | null; email: string | null; image: string | null } | null = null;
  try {
    const result = await postgres.query<{ id: string; name: string | null; email: string | null; image: string | null }>(
      'SELECT id, name, email, image FROM users WHERE id = $1',
      [session.user.id]
    );
    pgUser = result.rows[0] || null;
  } catch (err) {
    console.warn('[PROFILE_GET_PG_WARN]', err instanceof Error ? err.message : String(err));
  }

  let profileData: Record<string, unknown> | null = null;
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!error && data) {
      profileData = data;
    }
  } catch (err) {
    console.warn('[PROFILE_GET_SB_WARN]', err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({
    success: true,
    user: {
      id: session.user.id,
      name: (profileData?.full_name as string) || pgUser?.name || session.user.name || '',
      email: pgUser?.email || session.user.email || '',
      image: (profileData?.avatar_url as string) || pgUser?.image || session.user.image || '',
      locale: (profileData?.preferred_language as string) || currentLocale,
      education_stage: (profileData?.education_stage as string) || null,
      is_under_18: Boolean(profileData?.is_under_18),
      parental_consent: Boolean(profileData?.parental_consent),
      region: (profileData?.region as string) || null,
      telegram: (profileData?.telegram as string) || null,
      goal: (profileData?.goal as string) || null,
      privacy_consent: Boolean(profileData?.privacy_consent),
    },
  });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const image = typeof body.image === 'string' ? body.image.trim().slice(0, 1000) : null;
  const locale = typeof body.locale === 'string' && isValidLocale(body.locale) ? body.locale : 'uz';

  const rawStage = typeof body.education_stage === 'string' ? body.education_stage.trim() : null;
  const education_stage = ['school', 'university', 'working', 'other'].includes(rawStage || '') ? rawStage : null;

  const is_under_18 = Boolean(body.is_under_18);
  const parental_consent = is_under_18 ? Boolean(body.parental_consent) : false;

  const region = typeof body.region === 'string' && body.region.trim() ? body.region.trim().slice(0, 100) : null;
  const telegram = typeof body.telegram === 'string' && body.telegram.trim()
    ? body.telegram.trim().replace(/^@/, '').slice(0, 50)
    : null;
  const goal = typeof body.goal === 'string' && body.goal.trim() ? body.goal.trim().slice(0, 500) : null;
  const privacy_consent = Boolean(body.privacy_consent);

  if (!name || name.length < 2) {
    return NextResponse.json({ success: false, error: 'invalid_name' }, { status: 400 });
  }

  // Update Postgres users table if available
  try {
    await postgres.query(
      'UPDATE users SET name = $1, image = $2 WHERE id = $3',
      [name, image, session.user.id]
    );
  } catch (err) {
    console.warn('[PROFILE_UPDATE_PG_WARN]', err instanceof Error ? err.message : String(err));
  }

  // Upsert into Supabase profiles
  try {
    const supabase = getServiceRoleClient();
    const fullProfile = {
      id: session.user.id,
      full_name: name,
      role: 'mentee',
      avatar_url: image,
      education_stage,
      is_under_18,
      parental_consent,
      region,
      telegram,
      goal,
      preferred_language: locale,
      privacy_consent,
      privacy_consent_at: privacy_consent ? new Date().toISOString() : null,
      privacy_policy_version: privacy_consent ? 'v1.0' : null,
    };

    const { error: fullError } = await supabase
      .from('profiles')
      .upsert(fullProfile, { onConflict: 'id' });

    if (fullError && (fullError.code === '42703' || fullError.code === 'PGRST204' || fullError.message?.includes('column'))) {
      console.warn('[PROFILE_UPSERT_FALLBACK] Columns pending migration, upserting base profile');
      await supabase
        .from('profiles')
        .upsert(
          {
            id: session.user.id,
            full_name: name,
            role: 'mentee',
          },
          { onConflict: 'id' }
        );
    }
  } catch (err) {
    console.warn('[PROFILE_UPDATE_SB_WARN]', err instanceof Error ? err.message : String(err));
  }

  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
  });

  return NextResponse.json({
    success: true,
    user: {
      id: session.user.id,
      name,
      email: session.user.email || '',
      image,
      locale,
      education_stage,
      is_under_18,
      parental_consent,
      region,
      telegram,
      goal,
      privacy_consent,
    },
  });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email || '';

  // Scrubbed server audit log without raw PII
  console.log('[AUDIT_ACCOUNT_DELETION_REQUEST]', {
    action: 'delete_mentee_account',
    userId,
    timestamp: new Date().toISOString(),
  });

  try {
    const supabase = getServiceRoleClient();

    // 1. Anonymize past bookings associated with user's email
    if (userEmail) {
      await supabase
        .from('bookings')
        .update({
          student_name: 'Anonymized User',
          email: 'deleted@deleted.local',
          phone: null,
          telegram: null,
          question: '[Anonymized]',
        })
        .eq('email', userEmail);
    }

    // 2. Anonymize user reviews if any
    if (userEmail) {
      await supabase
        .from('reviews')
        .update({
          author_name: 'Anonim foydalanuvchi',
        })
        .eq('student_email', userEmail);
    }

    // 3. Remove row from Supabase profiles
    await supabase.from('profiles').delete().eq('id', userId);
  } catch (err) {
    console.warn('[ACCOUNT_DELETION_SB_WARN]', err instanceof Error ? err.message : String(err));
  }

  // 4. Remove from Postgres users/accounts/sessions if configured
  try {
    await postgres.query('DELETE FROM accounts WHERE "userId" = $1', [userId]);
    await postgres.query('DELETE FROM sessions WHERE "userId" = $1', [userId]);
    await postgres.query('DELETE FROM users WHERE id = $1', [userId]);
  } catch (err) {
    console.warn('[ACCOUNT_DELETION_PG_WARN]', err instanceof Error ? err.message : String(err));
  }

  // 5. Expire session cookies
  const cookieStore = await cookies();
  cookieStore.delete('authjs.session-token');
  cookieStore.delete('__Secure-authjs.session-token');

  return NextResponse.json({ success: true, message: 'Account deleted and data anonymized' });
}
