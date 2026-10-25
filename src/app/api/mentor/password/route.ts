import { NextResponse } from 'next/server';
import { postgres } from '@/lib/postgres';
import { hashPassword, tokenHash } from '@/lib/mentorPasswords';
import { createMentorSession } from '@/lib/mentorSession';
import { isSameOrigin } from '@/lib/serverSecurity';
import { allowRequest, requestIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
  if (!(await allowRequest('mentor-activate:' + requestIp(request), 10, 15 * 60_000)))
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.token !== 'string' ||
    !/^[0-9a-f]{64}$/.test(body.token) ||
    typeof body.password !== 'string' ||
    body.password.length < 12 ||
    body.password.length > 256
  )
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const hash = await hashPassword(body.password);
  const client = await postgres.connect();
  let accountId: string;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id FROM mentor_accounts WHERE invite_hash=$1 AND invite_expires_at>now() FOR UPDATE',
      [tokenHash(body.token)],
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'invalid_link' }, { status: 400 });
    }
    accountId = rows[0].id;
    await client.query(
      'UPDATE mentor_accounts SET password_hash=$1,invite_hash=NULL,invite_expires_at=NULL WHERE id=$2',
      [hash, accountId],
    );
    await client.query('DELETE FROM mentor_sessions WHERE account_id=$1', [accountId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  await createMentorSession(accountId);
  return NextResponse.json({ success: true });
}
