import 'server-only';

import { auth } from '@/auth';

export async function resolveMenteeFromRequest(
  request?: Request
): Promise<{ userId: string; email: string | null; name: string | null } | null> {
  void request;
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    userId: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}
