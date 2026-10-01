import 'server-only';

import { getServiceRoleClient } from './supabaseServiceRole';

export async function resolveMenteeFromRequest(
  request: Request
): Promise<{ userId: string; email: string | null } | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) return null;

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  const user = data.user;
  if (error || !user || user.is_anonymous) return null;
  return { userId: user.id, email: user.email ?? null };
}
