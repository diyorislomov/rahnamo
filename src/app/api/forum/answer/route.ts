import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
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

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error('Service role client unavailable:', err);
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const { data: question } = await supabase.from('forum_questions').select('id').eq('id', questionId).maybeSingle();
  if (!question) {
    return NextResponse.json({ success: false, error: 'question_not_found' }, { status: 404 });
  }

  // Service role, not the anon client -- forum_answers' old
  // WITH CHECK (true) policy let ANYONE insert an answer as any
  // counselor directly via the REST API, with or without this route.
  // That policy is dropped in this same stage (see schema.sql section
  // 12); this route (already gated by resolveMentorFromRequest above) is
  // now the only path in, matching how /api/threads/reply already works.
  const { error } = await supabase.from('forum_answers').insert({
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
