import { NextResponse } from 'next/server';
import { resolveMenteeFromRequest } from '@/lib/menteeSession';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';

function threadPayload(row: Record<string, unknown>) {
  return { ...row, student_auth_id: row.user_id, device_id: row.user_id };
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
  return NextResponse.json({ success: true, thread: threadPayload(thread), messages: messages.rows });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  const mentee = await resolveMenteeFromRequest(request);
  if (!mentee) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
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
    return NextResponse.json({ success: true, thread: threadPayload(result.rows[0]) });
  }

  if (action !== 'ask') return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!body || body.length > 4000) return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });

  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'SELECT * FROM question_threads WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [threadId, mentee.userId]
    );
    const thread = result.rows[0];
    if (!thread) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'thread_not_found' }, { status: 404 });
    }
    if (thread.payment_status !== 'active') {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'awaiting_payment' }, { status: 409 });
    }
    await client.query(
      `INSERT INTO thread_messages (thread_id, sender_role, body) VALUES ($1, 'student', $2)`,
      [threadId, body]
    );
    const questionsUsed = Number(thread.questions_used) + 1;
    const totalOwed = questionsUsed * Number(thread.price_per_question);
    const nextStatus = thread.soft_cap != null && questionsUsed >= Number(thread.soft_cap) ? 'awaiting_payment' : 'active';
    await client.query(
      'UPDATE question_threads SET questions_used = $1, total_owed = $2, payment_status = $3 WHERE id = $4',
      [questionsUsed, totalOwed, nextStatus, threadId]
    );
    await client.query('COMMIT');
    return NextResponse.json({ success: true, questions_used: questionsUsed, total_owed: totalOwed, awaiting_payment: nextStatus !== 'active' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[THREAD_ASK_FAILED]', error);
    return NextResponse.json({ success: false, error: 'query_failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
