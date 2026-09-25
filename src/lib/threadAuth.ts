import { supabase } from './supabase';

// Reuse the persisted anonymous identity and share concurrent startup calls.
// Merely browsing the catalog never creates an account.
let pending: Promise<string> | undefined;
export function ensureStudentAuth(): Promise<string> {
  if (pending) return pending;
  pending = (async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session?.user?.id) return data.session.user.id;
    const result = await supabase.auth.signInAnonymously();
    if (result.error || !result.data.user) throw new Error('Anonymous sign-in failed');
    return result.data.user.id;
  })().finally(() => { pending = undefined; });
  return pending;
}
