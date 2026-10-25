import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';

// Admin thread changes require the signed admin session.
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
        json_build_object('full_name', c.full_name, 'headline', c.headline) AS counselor,
        CASE
          WHEN qt.reply_status = 'pending_mentor_reply' AND qt.reply_deadline_at IS NOT NULL AND qt.reply_deadline_at < now()
          THEN true
          ELSE false
        END AS is_overdue
       FROM question_threads qt
       LEFT JOIN bookings b ON b.id = qt.booking_id
       LEFT JOIN counselors c ON c.id = qt.counselor_id
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
  if (typeof threadId !== 'string' || typeof action !== 'string') {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    const existingResult = await client.query(
      'SELECT * FROM question_threads WHERE id = $1 FOR UPDATE',
      [threadId]
    );
    const thread = existingResult.rows[0];
    if (!thread) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'thread_not_found' }, { status: 404 });
    }

    if (action === 'confirm_payment') {
      const bankReference = typeof input.bankReference === 'string' ? input.bankReference.trim() : '';
      const confirmedAmount = typeof input.confirmedAmount === 'number' ? input.confirmedAmount : Number(input.confirmedAmount);

      if (!bankReference || bankReference.length < 3 || !confirmedAmount || confirmedAmount <= 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          success: false,
          error: 'invalid_bank_details',
          message: 'Bank reference and confirmed amount are required.',
        }, { status: 400 });
      }

      if (thread.payment_status !== 'pending_payment') {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'thread_already_processed' }, { status: 409 });
      }

      const updateResult = await client.query(
        `UPDATE question_threads
         SET payment_status = 'paid',
             total_paid = $1,
             bank_reference = $2,
             confirmed_amount = $1,
             confirmed_by_admin = 'admin',
             admin_confirmed_at = now()
         WHERE id = $3
         RETURNING *`,
        [confirmedAmount, bankReference, threadId]
      );

      if (thread.booking_id) {
        await client.query(
          `UPDATE bookings SET payment_status = 'confirmed'
           WHERE id = $1 AND payment_status = 'pending'`,
          [thread.booking_id]
        );
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, thread: updateResult.rows[0] });
    }

    if (action === 'refund') {
      const updateResult = await client.query(
        `UPDATE question_threads
         SET reply_status = 'refunded',
             payment_status = 'closed',
             closed_at = now()
         WHERE id = $1
         RETURNING *`,
        [threadId]
      );
      await client.query('COMMIT');
      return NextResponse.json({ success: true, thread: updateResult.rows[0] });
    }

    if (action === 'reassign') {
      const newCounselorId = typeof input.newCounselorId === 'string' ? input.newCounselorId.trim() : '';
      if (!newCounselorId) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'missing_new_counselor' }, { status: 400 });
      }

      const updateResult = await client.query(
        `UPDATE question_threads
         SET counselor_id = $1,
             reply_deadline_at = now() + interval '48 hours',
             reply_status = 'reassigned'
         WHERE id = $2
         RETURNING *`,
        [newCounselorId, threadId]
      );
      await client.query('COMMIT');
      return NextResponse.json({ success: true, thread: updateResult.rows[0] });
    }

    if (action === 'close') {
      const updateResult = await client.query(
        `UPDATE question_threads
         SET payment_status = 'closed',
             closed_at = now()
         WHERE id = $1
         RETURNING *`,
        [threadId]
      );
      await client.query('COMMIT');
      return NextResponse.json({ success: true, thread: updateResult.rows[0] });
    }

    await client.query('ROLLBACK');
    return NextResponse.json({ success: false, error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[ADMIN_THREAD_ACTION_FAILED]', error);
    return NextResponse.json({ success: false, error: 'action_failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
