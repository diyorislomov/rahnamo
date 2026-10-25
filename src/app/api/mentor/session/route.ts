import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { postgres } from '@/lib/postgres';
import { resolveMentorFromRequest, createMentorSession, MENTOR_COOKIE } from '@/lib/mentorSession';
import { tokenHash, verifyPassword } from '@/lib/mentorPasswords';
import { isSameOrigin } from '@/lib/serverSecurity';
import { allowRequest, requestIp } from '@/lib/rateLimit';

export async function GET(request: Request) {
  const mentor = await resolveMentorFromRequest(request);
  return NextResponse.json(
    { session: mentor ? { user: { id: mentor.authId }, counselorId: mentor.counselorId } : null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
  if (!(await allowRequest('mentor-login:' + requestIp(request), 10, 15 * 60_000)))
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.email !== 'string' ||
    body.email.length > 254 ||
    typeof body.password !== 'string' ||
    body.password.length > 256
  )
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { rows } = await postgres.query(
    'SELECT id,password_hash FROM mentor_accounts WHERE lower(email)=$1',
    [body.email.trim().toLowerCase()],
  );
  if (!(await verifyPassword(body.password, rows[0]?.password_hash ?? null)))
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  await createMentorSession(rows[0].id);
  return NextResponse.json({ success: true });
}
export async function DELETE(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
  const jar = await cookies();
  const token = jar.get(MENTOR_COOKIE)?.value;
  if (token)
    await postgres.query('DELETE FROM mentor_sessions WHERE token_hash=$1', [tokenHash(token)]);
  jar.delete(MENTOR_COOKIE);
  return NextResponse.json({ success: true });
}
