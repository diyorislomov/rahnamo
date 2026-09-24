import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

// Mirrors /api/forum/answer's shared-passcode gate, but with real
// enforcement behind it: no RLS policy on thread_messages permits a
// 'counselor' row via the anon/authenticated roles at all, so this route
// (using the service_role key, never the anon key) is the ONLY path a
// counselor reply can reach the table through -- unlike forum, where the
// same passcode check guards a table whose RLS would let anyone post as
// any counselor directly against the REST API regardless.
export async function POST(request: Request) {
  const { threadId, counselorId, body, passcode } = await request.json();
  const validPasscode = process.env.COUNSELOR_PASSCODE;

  if (!validPasscode) {
    console.error('COUNSELOR_PASSCODE is not configured on the server');
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  if (typeof passcode !== 'string' || passcode !== validPasscode) {
    return NextResponse.json({ success: false, error: 'invalid_passcode' }, { status: 401 });
  }

  if (
    typeof threadId !== 'string' ||
    typeof counselorId !== 'string' ||
    typeof body !== 'string' ||
    body.trim().length < 1
  ) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error('Service role client unavailable:', err);
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  // Confirms the thread actually belongs to the counselor claimed --
  // the passcode is shared across all mentors, so this is the only check
  // standing between "I know the passcode" and "I can reply in anyone's
  // thread under any counselor's name."
  const { data: thread, error: threadError } = await supabase
    .from('question_threads')
    .select('id, counselor_id')
    .eq('id', threadId)
    .single();

  if (threadError || !thread) {
    return NextResponse.json({ success: false, error: 'thread_not_found' }, { status: 404 });
  }
  if (thread.counselor_id !== counselorId) {
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
