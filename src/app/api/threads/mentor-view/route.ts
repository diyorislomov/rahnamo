import { NextResponse } from 'next/server';
import { resolveMentorFromRequest } from '@/lib/mentorSession';
import { allowRequest } from '@/lib/rateLimit';
import { postgres } from '@/lib/postgres';

function sanitizeThreadForMentor(thread: Record<string, unknown>) {
  const rawName = (thread.student_name as string) || '';
  const firstName = rawName.trim().split(' ')[0] || 'Murojaatchi';

  // Strict RBAC & Data Minimization:
  // Mentors must NEVER see bank_reference, confirmed_amount, confirmed_by_admin, admin_confirmed_at, or payment_receipt
  const {
    bank_reference,
    confirmed_amount,
    confirmed_by_admin,
    admin_confirmed_at,
    payment_receipt,
    student_email,
    student_phone,
    ...safeThread
  } = thread;

  return {
    ...safeThread,
    student_name: firstName,
    student_email: null,
    student_phone: null,
    telegram: safeThread.telegram || null,
    student_telegram: safeThread.student_telegram || safeThread.telegram || null,
  };
}

export async function POST(request: Request) {
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  if (!(await allowRequest(`mentor-view:${mentor.authId}`, 120, 15 * 60 * 1000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let threads: Record<string, unknown>[] = [];
  let messages: Record<string, unknown>[] = [];

  try {
    // Strictly show ONLY 'paid' threads. A mentor must NEVER see an unpaid thread.
    const threadResult = await postgres.query(
      `SELECT qt.*, qt.user_id AS student_auth_id, qt.user_id::text AS device_id,
              b.student_name, b.telegram, b.telegram AS student_telegram
       FROM question_threads qt
       LEFT JOIN bookings b ON b.id = qt.booking_id
       WHERE qt.counselor_id = $1 AND qt.payment_status = 'paid'
       ORDER BY qt.created_at DESC`,
      [mentor.counselorId]
    );
    threads = threadResult.rows;
    const threadIds = threads.map((thread) => thread.id);
    if (threadIds.length > 0) {
      messages = (
        await postgres.query(
          'SELECT id, thread_id, sender_role, body, created_at FROM thread_messages WHERE thread_id = ANY($1::uuid[]) ORDER BY created_at',
          [threadIds]
        )
      ).rows;
    }
  } catch (pgErr) {
    console.warn('[MENTOR_VIEW_PG_FALLBACK]', pgErr instanceof Error ? pgErr.message : String(pgErr));
    return NextResponse.json({ success: false, error: 'query_failed' }, { status: 503 });
  }

  const sanitizedThreads = threads.map(sanitizeThreadForMentor);
  return NextResponse.json({ success: true, threads: sanitizedThreads, messages });
}
