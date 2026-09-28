import { supabase } from './supabase';

// Bridge-stage helper (Stage 2 of the real-auth migration): returns a real,
// logged-in mentee's auth.uid() if one exists on this browser, or null
// otherwise. Deliberately excludes anonymous sessions (Text Q&A's
// ensureStudentAuth() creates those) -- an anonymous uid is not a real
// mentee identity, so it must never end up in bookings.mentee_auth_id.
// Callers keep writing device_id unconditionally alongside this; this is
// additive, not a replacement, until Stage 3 removes the guest path.
export async function getMenteeAuthId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (user && !user.is_anonymous) {
    return user.id;
  }
  return null;
}
