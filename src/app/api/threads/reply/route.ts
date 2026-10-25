import { NextResponse } from 'next/server';
import { resolveMentorFromRequest } from '@/lib/mentorSession';
import { allowRequest } from '@/lib/rateLimit';
import { postgres } from '@/lib/postgres';
import { maskOffPlatformContacts } from '@/lib/disintermediation';

export async function POST(request: Request) {
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  if (!(await allowRequest(`thread-reply:${mentor.authId}`, 60, 15 * 60 * 1000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const threadId = typeof input.threadId === 'string' ? input.threadId : '';
  const rawBody = typeof input.body === 'string' ? input.body.trim() : '';
  if (!threadId || threadId.length > 100 || !rawBody || rawBody.length > 4000) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  // Mask off-platform contacts to protect platform escrow & safety
  const body = maskOffPlatformContacts(rawBody);

  const threadResult = await postgres.query(
    'SELECT id, counselor_id, payment_status FROM question_threads WHERE id = $1',
    [threadId]
  );
  const thread = threadResult.rows[0];
  if (!thread) return NextResponse.json({ success: false, error: 'thread_not_found' }, { status: 404 });
  if (thread.counselor_id !== mentor.counselorId) {
    return NextResponse.json({ success: false, error: 'counselor_mismatch' }, { status: 403 });
  }

  // Strictly enforce pre-paid requirement: mentor can only answer 'paid' threads
  if (thread.payment_status !== 'paid') {
    return NextResponse.json({ success: false, error: 'thread_not_paid' }, { status: 403 });
  }

  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    const msgResult = await client.query(
      `INSERT INTO thread_messages (thread_id, sender_role, body)
       VALUES ($1, 'counselor', $2)
       RETURNING id, thread_id, sender_role, body, created_at`,
      [threadId, body]
    );

    // Mentor has answered: clear deadline and mark replied
    await client.query(
      `UPDATE question_threads
       SET reply_status = 'replied', reply_deadline_at = NULL
       WHERE id = $1`,
      [threadId]
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: msgResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[THREAD_REPLY_FAILED]', error);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  } finally {
    client.release();
  }
}
