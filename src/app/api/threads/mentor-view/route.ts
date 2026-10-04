import { NextResponse } from 'next/server';
import { resolveMentorFromRequest } from '@/lib/mentorSession';
import { allowRequest } from '@/lib/rateLimit';
import { postgres } from '@/lib/postgres';

export async function POST(request: Request) {
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  if (!(await allowRequest(`mentor-view:${mentor.authId}`, 120, 15 * 60 * 1000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  const threadResult = await postgres.query(
    `SELECT *, user_id AS student_auth_id, user_id::text AS device_id
     FROM question_threads WHERE counselor_id = $1 AND payment_status <> 'closed'
     ORDER BY created_at DESC`,
    [mentor.counselorId]
  );
  const threads = threadResult.rows;
  const threadIds = threads.map((thread) => thread.id);
  const messages = threadIds.length > 0
    ? (await postgres.query(
        'SELECT * FROM thread_messages WHERE thread_id = ANY($1::uuid[]) ORDER BY created_at',
        [threadIds]
      )).rows
    : [];
  return NextResponse.json({ success: true, threads, messages });
}
