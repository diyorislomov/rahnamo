import { NextResponse } from 'next/server';
import { resolveMentorFromRequest } from '@/lib/mentorSession';
import { allowRequest } from '@/lib/rateLimit';
import { postgres } from '@/lib/postgres';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

function sanitizeThreadForMentor(thread: Record<string, unknown>) {
  const rawName = (thread.student_name as string) || '';
  const firstName = rawName.trim().split(' ')[0] || 'Murojaatchi';
  const isPaid = thread.payment_status === 'active' || thread.payment_status === 'paid';

  return {
    ...thread,
    student_name: firstName,
    // Sensitive PII strictly stripped from mentor views
    student_email: null,
    student_phone: null,
    // Contact handle exposed only if paid
    telegram: isPaid ? thread.telegram : null,
    student_telegram: isPaid ? (thread.student_telegram || thread.telegram) : null,
  };
}

export async function POST(request: Request) {
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  if (!(await allowRequest(`mentor-view:${mentor.authId}`, 120, 15 * 60 * 1000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let threads: Record<string, unknown>[] = [];
  let messages: Record<string, unknown>[] = [];

  try {
    const threadResult = await postgres.query(
      `SELECT *, user_id AS student_auth_id, user_id::text AS device_id
       FROM question_threads WHERE counselor_id = $1 AND payment_status <> 'closed'
       ORDER BY created_at DESC`,
      [mentor.counselorId]
    );
    threads = threadResult.rows;
    const threadIds = threads.map((thread) => thread.id);
    if (threadIds.length > 0) {
      messages = (
        await postgres.query(
          'SELECT * FROM thread_messages WHERE thread_id = ANY($1::uuid[]) ORDER BY created_at',
          [threadIds]
        )
      ).rows;
    }
  } catch (pgErr) {
    console.warn('[MENTOR_VIEW_PG_FALLBACK]', pgErr instanceof Error ? pgErr.message : String(pgErr));
    // Supabase fallback
    try {
      const sbClient = getServiceRoleClient();
      const { data: sbThreads } = await sbClient
        .from('question_threads')
        .select('*')
        .eq('counselor_id', mentor.counselorId)
        .neq('payment_status', 'closed')
        .order('created_at', { ascending: false });

      if (sbThreads) {
        threads = sbThreads;
        const threadIds = threads.map((t) => t.id);
        if (threadIds.length > 0) {
          const { data: sbMessages } = await sbClient
            .from('thread_messages')
            .select('*')
            .in('thread_id', threadIds)
            .order('created_at', { ascending: true });
          if (sbMessages) messages = sbMessages;
        }
      }
    } catch (sbErr) {
      console.warn('[MENTOR_VIEW_SB_FALLBACK_WARN]', sbErr instanceof Error ? sbErr.message : String(sbErr));
    }
  }

  const sanitizedThreads = threads.map(sanitizeThreadForMentor);
  return NextResponse.json({ success: true, threads: sanitizedThreads, messages });
}
