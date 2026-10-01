import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { isSameOrigin } from '@/lib/serverSecurity';

// Stage 3 of the real-auth migration: bookings RLS is being tightened so
// only a mentee can read/insert their own row (auth.uid() = mentee_auth_id)
// and nobody but service_role can UPDATE at all -- admin's own read/confirm/
// complete actions previously ran on the anon key against the old blanket
// USING(true)/WITH CHECK(true) policies, which is also what let ANY
// unauthenticated client insert a booking pre-marked payment_status
// 'confirmed'/status 'completed' directly (confirmed live during this
// stage's verification, predating this migration entirely). Everything
// here goes through service_role behind the admin session cookie instead,
// mirroring /api/admin/threads.
async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error('Service role client unavailable:', err);
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });

  if (error) {
    console.error('[ADMIN_BOOKINGS_LIST_FAILED]', error);
    return NextResponse.json({ success: false, error: 'query_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, bookings: data });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const { action, id } = input;
  if (typeof id !== 'string' || typeof action !== 'string' || !['confirm_payment', 'complete'].includes(action)) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error('Service role client unavailable:', err);
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const update = action === 'confirm_payment' ? { payment_status: 'confirmed' } : { status: 'completed' };
  const selectCols = action === 'confirm_payment' ? 'id, payment_status' : 'id, status';

  // Same discipline as every other admin action here: a clean "no error"
  // is not proof the row actually changed, so the update must come back
  // with the row it touched, not just a null error.
  let query = supabase.from('bookings').update(update).eq('id', id);
  query =
    action === 'confirm_payment'
      ? query.eq('payment_status', 'pending')
      : query.eq('payment_status', 'confirmed').eq('status', 'confirmed');
  const { data, error } = await query.select(selectCols).single();

  if (error || !data) {
    console.error('[ADMIN_BOOKING_ACTION_FAILED]', action, id, error);
    return NextResponse.json({ success: false, error: 'update_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, booking: data });
}
