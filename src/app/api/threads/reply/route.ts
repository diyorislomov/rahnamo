import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { resolveMentorFromRequest } from '@/lib/mentorSession';

// Stage 5: identity now comes only from the caller's real mentor session
// (resolveMentorFromRequest), never from a client-supplied counselorId --
// the old shared COUNSELOR_PASSCODE plus a thread/counselor-match check
// only confirmed internal consistency, not who was actually calling.
// No RLS policy on thread_messages permits a 'counselor' row via the
// anon/authenticated roles at all, so this route (service_role) remains
// the only path a counselor reply can reach the table through.
export async function POST(request: Request) {
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const { threadId, body } = await request.json();
  if (typeof threadId !== 'string' || typeof body !== 'string' || body.trim().length < 1) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error('Service role client unavailable:', err);
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  // Confirms the thread actually belongs to the real, authenticated
  // mentor calling this route -- this is now a genuine identity check,
  // not just internal consistency against a client-claimed id.
  const { data: thread, error: threadError } = await supabase
    .from('question_threads')
    .select('id, counselor_id')
    .eq('id', threadId)
    .single();

  if (threadError || !thread) {
    return NextResponse.json({ success: false, error: 'thread_not_found' }, { status: 404 });
  }
  if (thread.counselor_id !== mentor.counselorId) {
    return NextResponse.json({ success: false, error: 'counselor_mismatch' }, { status: 403 });
  }

  const { data: inserted, error } = await supabase
    .from('thread_messages')
    .insert({ thread_id: threadId, sender_role: 'counselor', body: body.trim() })
    .select('id, thread_id, sender_role, body, created_at')
    .single();

  if (error) {
    console.error('[THREAD_REPLY_INSERT_FAILED]', threadId, error);
    return NextResponse.json({ success: false, error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: inserted });
}
