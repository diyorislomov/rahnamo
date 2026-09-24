import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

// Admin's own thread actions (list, manually flag an uncapped thread for
// payment, confirm payment) all go through the service_role key -- anon
// has no grant on payment_status at all, by design, so admin can't just
// call supabase.from('question_threads').update(...) directly from the
// browser the way it does for bookings today. The admin session cookie
// (the same one /api/admin/check verifies) is the gate here instead.
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

  const { data, error } = await supabase
    .from('question_threads')
    .select(
      '*, booking:bookings(student_name, email, telegram), counselor:counselors(full_name, headline)'
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ADMIN_THREADS_LIST_FAILED]', error);
    return NextResponse.json({ success: false, error: 'query_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, threads: data });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const { action, threadId } = await request.json();
  if (typeof threadId !== 'string' || !['flag', 'confirm_payment'].includes(action)) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error('Service role client unavailable:', err);
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const update =
    action === 'flag'
      ? { payment_status: 'awaiting_payment' }
      : { payment_status: 'closed', closed_at: new Date().toISOString() };

  // Same discipline as every other admin action in this app: a clean
  // "no error" is not proof the row actually changed, so the update must
  // come back with the row it touched, not just a null error.
  const { data, error } = await supabase
    .from('question_threads')
    .update(update)
    .eq('id', threadId)
    .select('id, payment_status')
    .single();

  if (error || !data) {
    console.error('[ADMIN_THREAD_ACTION_FAILED]', action, threadId, error);
    return NextResponse.json({ success: false, error: 'update_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, thread: data });
}
