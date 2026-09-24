import { supabase } from './supabase';

// Called lazily -- only at the moment a student actually starts a text
// thread, never on ordinary page load -- so casual visitors never get an
// auth.users row created for them. This is the real, RLS-enforceable
// identity behind question_threads.student_auth_id; unlike device_id
// (a plain localStorage UUID nothing ties to a request), auth.uid() from a
// real Supabase session is what a Postgres RLS policy can actually check.
//
// Idempotent: supabase-js persists the anonymous session itself, so a
// returning visitor on the same browser gets the same auth.uid() back
// without a new sign-in call. Throws (does not silently fall back to
// anything) if anonymous sign-ins aren't enabled in the Supabase project --
// callers must surface that as a real, visible error, not a fake success.
export async function ensureStudentAuth(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user?.id) {
    return sessionData.session.user.id;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(error?.message || 'Anonymous sign-in failed');
  }
  return data.user.id;
}
