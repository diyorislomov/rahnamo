import { NextResponse } from 'next/server';
import { one, insertRow } from '@/lib/database';
import { resolveMentorFromRequest } from '@/lib/mentorSession';
import { allowRequest } from '@/lib/rateLimit';

export async function POST(request: Request) {
  // Stage 5: identity comes only from the caller's real mentor session
  // now, never from a client-supplied counselorId -- the old shared
  // COUNSELOR_PASSCODE let anyone answer as any mentor by just picking a
  // different id from a dropdown.
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  if (!(await allowRequest(`forum-answer:${mentor.authId}`, 20, 15 * 60 * 1000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const { questionId, body } = input as Record<string, unknown>;

  if (
    typeof questionId !== 'string' ||
    questionId.length > 100 ||
    typeof body !== 'string' ||
    body.trim().length < 5 ||
    body.trim().length > 4000
  ) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const answer = { id, questionId, counselorId: mentor.counselorId, body: body.trim(), createdAt };

  const { data: question } = await one('SELECT id FROM forum_questions WHERE id=$1',[questionId]);
  if (!question) {
    return NextResponse.json({ success: false, error: 'question_not_found' }, { status: 404 });
  }

  const { error } = await insertRow('forum_answers', {
    id,
    question_id: questionId,
    counselor_id: mentor.counselorId,
    body: body.trim(),
  });

  if (error) {
    console.warn('Forum answer insert error:', error);
    return NextResponse.json({ success: false, error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, answer }, { status: 201 });
}
