import { NextResponse } from 'next/server';
import { resolveMenteeFromRequest } from '@/lib/menteeSession';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';
import { maskOffPlatformContacts } from '@/lib/disintermediation';

function sanitizeThreadForMentee(row: Record<string, unknown>) {
  // Strict data minimization: admin audit fields must NEVER be readable by mentees
  const {
    bank_reference,
    confirmed_amount,
    confirmed_by_admin,
    admin_confirmed_at,
    ...safe
  } = row;
  return {
    ...safe,
    student_auth_id: row.user_id,
    device_id: row.user_id,
  };
}

export async function GET(request: Request) {
  const mentee = await resolveMenteeFromRequest(request);
  if (!mentee) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const threadId = url.searchParams.get('threadId');
  const counselorId = url.searchParams.get('counselorId');

  const threadResult = threadId
    ? await postgres.query('SELECT * FROM question_threads WHERE id = $1 AND user_id = $2', [threadId, mentee.userId])
    : await postgres.query(
        `SELECT * FROM question_threads
         WHERE counselor_id = $1 AND user_id = $2 AND payment_status <> 'closed'
         ORDER BY created_at DESC LIMIT 1`,
        [counselorId, mentee.userId]
      );
  const thread = threadResult.rows[0];
  if (!thread) return NextResponse.json({ success: true, thread: null, messages: [] });
  const messages = await postgres.query(
    'SELECT id, thread_id, sender_role, body, created_at FROM thread_messages WHERE thread_id = $1 ORDER BY created_at',
    [thread.id]
  );
  return NextResponse.json({ success: true, thread: sanitizeThreadForMentee(thread), messages: messages.rows });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  const mentee = await resolveMenteeFromRequest(request);
  if (!mentee) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });

  if (mentee.isBlocked) return NextResponse.json({ success: false, error: 'user_blocked' }, { status: 403 });
  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const action = input.action;
  const threadId = typeof input.threadId === 'string' ? input.threadId : '';
  if (!threadId) return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });

  if (action === 'receipt') {
    const receipt = typeof input.receipt === 'string' ? input.receipt.trim() : '';
    if (receipt.length < 3 || receipt.length > 200) {
      return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
    }
    const result = await postgres.query(
      `UPDATE question_threads SET payment_receipt = $1
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [receipt, threadId, mentee.userId]
    );
    if (!result.rows[0]) return NextResponse.json({ success: false, error: 'thread_not_found' }, { status: 404 });
    return NextResponse.json({ success: true, thread: sanitizeThreadForMentee(result.rows[0]) });
  }

  if (action !== 'ask') return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  const rawBody = typeof input.body === 'string' ? input.body.trim() : '';
  if (!rawBody || rawBody.length > 4000) return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });

  // Anti-disintermediation masking
  const body = maskOffPlatformContacts(rawBody);

  const client = await postgres.connect();
  try {
    await client.query('BEGIN');

    // Atomic consumption: check-and-increment in a single statement
    // Strict pre-paid requirement: must be 'paid' and questions_used < questions_paid
    const updateResult = await client.query(
      `UPDATE question_threads
       SET questions_used = questions_used + 1,
           reply_deadline_at = now() + interval '48 hours',
           reply_status = 'pending_mentor_reply'
       WHERE id = $1 AND user_id = $2 AND payment_status = 'paid' AND questions_used < questions_paid
       RETURNING *`,
      [threadId, mentee.userId]
    );

    const updatedThread = updateResult.rows[0];
    if (!updatedThread) {
      // Find out why the atomic update matched 0 rows to return precise status code
      const checkResult = await client.query(
        'SELECT payment_status, questions_used, questions_paid FROM question_threads WHERE id = $1 AND user_id = $2',
        [threadId, mentee.userId]
      );
      await client.query('ROLLBACK');

      const existingThread = checkResult.rows[0];
      if (!existingThread) {
        return NextResponse.json({ success: false, error: 'thread_not_found' }, { status: 404 });
      }
      if (existingThread.payment_status !== 'paid') {
        return NextResponse.json({ success: false, error: 'payment_required' }, { status: 402 });
      }
      if (Number(existingThread.questions_used) >= Number(existingThread.questions_paid)) {
        return NextResponse.json({ success: false, error: 'pack_exhausted' }, { status: 402 });
      }
      return NextResponse.json({ success: false, error: 'ask_not_allowed' }, { status: 400 });
    }

    await client.query(
      `INSERT INTO thread_messages (thread_id, sender_role, body) VALUES ($1, 'student', $2)`,
      [threadId, body]
    );

    await client.query('COMMIT');
    return NextResponse.json({
      success: true,
      thread: sanitizeThreadForMentee(updatedThread),
      questions_used: updatedThread.questions_used,
      questions_paid: updatedThread.questions_paid,
      reply_deadline_at: updatedThread.reply_deadline_at,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[THREAD_POST_FAILED]', error);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  } finally {
    client.release();
  }
}
