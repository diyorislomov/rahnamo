import 'server-only';

import { auth } from '@/auth';
import { postgres } from '@/lib/postgres';

export async function resolveMenteeFromRequest(
  request?: Request
): Promise<{ userId: string; email: string | null; name: string | null; isBlocked?: boolean } | null> {
  void request;
  const session = await auth();
  if (!session?.user?.id) return null;

  let isBlocked = false;
  try {
    const check = await postgres.query(
      'SELECT is_blocked, deleted_at FROM users WHERE id = $1',
      [session.user.id]
    );
    if (check.rows[0]?.deleted_at) return null;
    isBlocked = Boolean(check.rows[0]?.is_blocked);
  } catch {
    // proceed
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    isBlocked,
  };
}
