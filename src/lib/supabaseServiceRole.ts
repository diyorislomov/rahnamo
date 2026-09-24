import { createClient } from '@supabase/supabase-js';

// Server-only. Never import this into a client component -- the whole
// point of the service_role key is that it bypasses RLS, which is exactly
// why it must never reach the browser bundle. Used only from API routes
// that have already checked their own gate (the admin session cookie, or
// the shared counselor passcode) before touching this client.
export function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.includes('placeholder') || !serviceKey) {
    throw new Error('Supabase service role client is not configured');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
