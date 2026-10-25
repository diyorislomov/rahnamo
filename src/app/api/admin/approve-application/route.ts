import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';
import { newToken, tokenHash } from '@/lib/mentorPasswords';
import { getGlobalLaunchDate, calculateCommissionFreeUntil } from '@/lib/platformSettings';

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  if (!verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value))
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  const input = await request.json().catch(() => null);
  if (
    !input ||
    typeof input.applicationId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(input.applicationId)
  )
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  const launch = await getGlobalLaunchDate();
  const token = newToken(),
    counselorId = 'c-' + crypto.randomUUID();
  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "SELECT * FROM counselor_applications WHERE id=$1 AND status='pending' FOR UPDATE",
      [input.applicationId],
    );
    const a = result.rows[0];
    if (!a) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'application_not_found' }, { status: 404 });
    }
    await client.query(
      `INSERT INTO counselors(id,email,full_name,headline,avatar_url,specialties,bio,standard_price,premium_price,price_per_question,soft_cap,commission_free_until)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        counselorId,
        a.email.toLowerCase(),
        a.full_name,
        a.headline,
        a.photo_url,
        a.specialties
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean),
        a.bio,
        a.expected_standard_price || 45000,
        a.expected_premium_price || 130000,
        a.expected_price_per_question,
        a.expected_soft_cap,
        calculateCommissionFreeUntil(new Date(), launch),
      ],
    );
    await client.query(
      "INSERT INTO mentor_accounts(counselor_id,email,invite_hash,invite_expires_at) VALUES($1,$2,$3,now()+interval '48 hours')",
      [counselorId, a.email.toLowerCase(), tokenHash(token)],
    );
    await client.query("UPDATE counselor_applications SET status='approved' WHERE id=$1", [a.id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    const duplicate =
      error && typeof error === 'object' && 'code' in error && error.code === '23505';
    return NextResponse.json(
      { success: false, error: duplicate ? 'email_already_registered' : 'approval_failed' },
      { status: duplicate ? 409 : 500 },
    );
  } finally {
    client.release();
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  return NextResponse.json({
    success: true,
    counselorId,
    activationUrl: origin + '/mentor/set-password#token=' + token,
  });
}
