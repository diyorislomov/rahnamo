import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { resolveMentorFromRequest } from '@/lib/mentorSession';

export async function POST(request: Request) {
  const { questionId, body } = await request.json();

  // Stage 5: identity comes only from the caller's real mentor session
  // now, never from a client-supplied counselorId -- the old shared
  // COUNSELOR_PASSCODE let anyone answer as any mentor by just picking a
  // different id from a dropdown.
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  if (typeof questionId !== 'string' || typeof body !== 'string' || body.trim().length < 5) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const answer = { id, questionId, counselorId: mentor.counselorId, body: body.trim(), createdAt };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseConfigured = !!supabaseUrl && !supabaseUrl.includes('placeholder');

  if (!supabaseConfigured) {
    // Local/demo environments without a real Supabase project: there's
    // nowhere server-side to persist to -- the client falls back to
    // localStorage for the same reason the rest of the forum does.
    return NextResponse.json({ success: true, persisted: false, answer });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error('Service role client unavailable:', err);
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
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

  return NextResponse.json({ success: true, persisted: true, answer });
}
