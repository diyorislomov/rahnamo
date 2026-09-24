import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

// Same shared-passcode gate as /api/threads/reply -- this is the read side
// of a mentor's inbox (their own non-closed threads + messages), the write
// side is that other route. Both exist purely because anon/authenticated
// have no read or write access to another student's or counselor's view of
// these tables at all; service_role is the only way in, gated by the
// passcode check here, not by RLS (there is none for this path).
export async function POST(request: Request) {
  const { counselorId, passcode } = await request.json();
  const validPasscode = process.env.COUNSELOR_PASSCODE;

  if (!validPasscode) {
    console.error('COUNSELOR_PASSCODE is not configured on the server');
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  if (typeof passcode !== 'string' || passcode !== validPasscode) {
    return NextResponse.json({ success: false, error: 'invalid_passcode' }, { status: 401 });
  }

  if (typeof counselorId !== 'string') {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
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
    .eq('counselor_id', counselorId)
    .neq('payment_status', 'closed')
    .order('created_at', { ascending: false });

  if (threadsError) {
    console.error('[MENTOR_INBOX_THREADS_FAILED]', counselorId, threadsError);
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
      console.error('[MENTOR_INBOX_MESSAGES_FAILED]', counselorId, msgError);
      return NextResponse.json({ success: false, error: 'query_failed' }, { status: 500 });
    }
    messages = msgData || [];
  }

  return NextResponse.json({ success: true, threads, messages });
}
