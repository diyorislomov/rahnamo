import { supabase } from './supabase';

// Stage 4 of the real-auth migration: Text Q&A used to fall back to
// signInAnonymously() here so a casual visitor could start a thread with no
// account. Mentee login is mandatory everywhere now (TextQaPanel gates on a
// real session before this is ever called), so a real, non-anonymous
// session is guaranteed by the time a caller reaches this point -- this
// just returns its id. Throws (does not silently fall back to anything) if
// that guarantee is somehow violated, since a caller relying on a real
// auth.uid() must never get a fake success.
export async function ensureStudentAuth(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (user && !user.is_anonymous) {
    return user.id;
  }

  throw new Error('No real mentee session -- login is required before this can be called');
}
