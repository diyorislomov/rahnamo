import 'server-only';
import { cookies } from 'next/headers';
import { postgres } from './postgres';
import { tokenHash, newToken } from './mentorPasswords';
import { isSameOrigin } from './serverSecurity';

export const MENTOR_COOKIE = 'rahnamo_mentor_session';
export async function createMentorSession(accountId: string) {
  const token = newToken();
  await postgres.query(
    "INSERT INTO mentor_sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '14 days')",
    [tokenHash(token), accountId],
  );
  const jar = await cookies();
  jar.set(MENTOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 14 * 86400,
  });
}
export async function resolveMentorFromRequest(
  request: Request,
): Promise<{ counselorId: string; authId: string } | null> {
  if (!['GET', 'HEAD'].includes(request.method) && !isSameOrigin(request)) return null;
  const token = (await cookies()).get(MENTOR_COOKIE)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const result = await postgres.query<{ counselor_id: string; account_id: string }>(
    `SELECT a.counselor_id,a.id AS account_id FROM mentor_sessions s
     JOIN mentor_accounts a ON a.id=s.account_id JOIN counselors c ON c.id=a.counselor_id
     WHERE s.token_hash=$1 AND s.expires_at>now()`,
    [tokenHash(token)],
  );
  const row = result.rows[0];
  return row ? { counselorId: row.counselor_id, authId: row.account_id } : null;
}
