import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { bodyOf, failure, HttpError, rateLimit, requireMentor, stringField, uuidField } from '@/lib/server/http';
export async function POST(request: Request) {
  try {
    const body = await bodyOf(request);
    const counselorId = await requireMentor(request, body.counselorId, body.passcode);
    await rateLimit(request, 'mentor-reply', 60, counselorId);
    const db = getServiceRoleClient();
    const threadId = uuidField(body.threadId);
    const { data: thread, error: threadError } = await db.from('question_threads').select('id').eq('id', threadId).eq('counselor_id', counselorId).maybeSingle();
    if (threadError) throw threadError;
    if (!thread) throw new HttpError(404, 'thread_not_found');
    // Payment closure stops new billable questions; mentors can still fulfill accepted questions.
    const { data, error } = await db.from('thread_messages').insert({ thread_id: threadId, sender_role: 'counselor', body: stringField(body.body, 1, 4000) }).select('*').single();
    if (error) throw error;
    return NextResponse.json({ success: true, message: data }, { status: 201 });
  } catch (error) { return failure(error); }
}
