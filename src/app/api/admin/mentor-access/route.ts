import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';
import { newToken, tokenHash } from '@/lib/mentorPasswords';

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
  if (!verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.id !== 'string' ||
    body.id.length > 100 ||
    typeof body.email !== 'string' ||
    body.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  ) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase(),
    token = newToken();
  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    const counselor = await client.query('SELECT id FROM counselors WHERE id=$1 FOR UPDATE', [
      body.id,
    ]);
    if (!counselor.rowCount) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    await client.query('UPDATE counselors SET email=$1 WHERE id=$2', [email, body.id]);
    await client.query(
      `INSERT INTO mentor_accounts(counselor_id,email,invite_hash,invite_expires_at)
      VALUES($1,$2,$3,now()+interval '48 hours') ON CONFLICT(counselor_id)
      DO UPDATE SET email=EXCLUDED.email,invite_hash=EXCLUDED.invite_hash,invite_expires_at=EXCLUDED.invite_expires_at`,
      [body.id, email, tokenHash(token)],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    const duplicate =
      error && typeof error === 'object' && 'code' in error && error.code === '23505';
    return NextResponse.json(
      { error: duplicate ? 'email_already_registered' : 'update_failed' },
      { status: duplicate ? 409 : 500 },
    );
  } finally {
    client.release();
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  return NextResponse.json({
    success: true,
    activationUrl: origin + '/mentor/set-password#token=' + token,
  });
}
