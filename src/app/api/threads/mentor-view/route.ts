import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { resolveMentorFromRequest } from '@/lib/mentorSession';

// Stage 5: identity comes only from the caller's real mentor session now
// -- the old shared COUNSELOR_PASSCODE plus a client-supplied counselorId
// let anyone read any mentor's inbox. service_role remains necessary since
// anon/authenticated have no read access to another mentor's view of
// these tables at all; resolveMentorFromRequest is what gates it now,
// not the passcode.
export async function POST(request: Request) {
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error('Service role client unavailable:', err);
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const { data: threads, error: threadsError } = await supabase
    .from('question_threads')
    .select('*')
    .eq('counselor_id', mentor.counselorId)
    .neq('payment_status', 'closed')
    .order('created_at', { ascending: false });

  if (threadsError) {
    console.error('[MENTOR_INBOX_THREADS_FAILED]', mentor.counselorId, threadsError);
    return NextResponse.json({ success: false, error: 'query_failed' }, { status: 500 });
  }

  const threadIds = (threads || []).map((th) => th.id);
  let messages: unknown[] = [];
  if (threadIds.length > 0) {
    const { data: msgData, error: msgError } = await supabase
      .from('thread_messages')
      .select('*')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('[MENTOR_INBOX_MESSAGES_FAILED]', mentor.counselorId, msgError);
      return NextResponse.json({ success: false, error: 'query_failed' }, { status: 500 });
    }
    messages = msgData || [];
  }

  return NextResponse.json({ success: true, threads, messages });
}
