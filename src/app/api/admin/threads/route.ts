import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';

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

  try {
    const result = await postgres.query(
      `SELECT qt.*, qt.user_id AS student_auth_id, qt.user_id::text AS device_id,
        json_build_object('student_name', b.student_name, 'email', b.email, 'telegram', b.telegram) AS booking,
        json_build_object('full_name', b.counselor_name, 'headline', b.counselor_headline) AS counselor
       FROM question_threads qt JOIN bookings b ON b.id = qt.booking_id
       ORDER BY qt.created_at DESC`
    );
    return NextResponse.json({ success: true, threads: result.rows });
  } catch (error) {
    console.error('[ADMIN_THREADS_LIST_FAILED]', error);
    return NextResponse.json({ success: false, error: 'query_failed' }, { status: 500 });
  }
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
  const { action, threadId } = input;
  if (typeof threadId !== 'string' || typeof action !== 'string' || !['flag', 'confirm_payment'].includes(action)) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const query = action === 'flag'
    ? `UPDATE question_threads SET payment_status = 'awaiting_payment'
       WHERE id = $1 AND payment_status = 'active' RETURNING id, payment_status`
    : `UPDATE question_threads SET payment_status = 'closed', closed_at = now()
       WHERE id = $1 AND payment_status = 'awaiting_payment' AND payment_receipt IS NOT NULL
       RETURNING id, payment_status`;
  const result = await postgres.query(query, [threadId]);
  const thread = result.rows[0];
  if (!thread) {
    console.error('[ADMIN_THREAD_ACTION_FAILED]', action, threadId);
    return NextResponse.json({ success: false, error: 'update_failed' }, { status: 409 });
  }
  return NextResponse.json({ success: true, thread });
}
