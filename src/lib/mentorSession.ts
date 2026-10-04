import 'server-only';
import { supabase } from './supabase';

// Stage 5 of the real-auth migration: resolves the REAL, authenticated
// mentor behind an incoming request's `Authorization: Bearer <access
// token>` header. This is the ONLY source of truth for "who is calling
// this route" -- callers must never trust a client-supplied counselorId,
// which is exactly what let the old shared COUNSELOR_PASSCODE be used to
// reply as, or read the inbox of, any other mentor.
//
// counselors.auth_id is the sole authority for mentor capability
// everywhere else in this app (see schema.sql); this mirrors that by
// looking the caller's counselors row up by their real auth.uid(), never
// by anything the request body claims.
export async function resolveMentorFromRequest(
  request: Request
): Promise<{ counselorId: string; authId: string } | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return null;

  const { data: counselorRow, error: counselorError } = await supabase
    .from('counselors')
    .select('id')
    .eq('auth_id', userData.user.id)
    .maybeSingle();

  if (counselorError || !counselorRow) return null;
  return { counselorId: counselorRow.id, authId: userData.user.id };
}
