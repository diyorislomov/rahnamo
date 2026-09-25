import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { bodyOf, failure, requireMentor } from '@/lib/server/http';
export async function POST(request: Request) {
  try {
    const body = await bodyOf(request);
    const counselorId = await requireMentor(request, body.counselorId, body.passcode);
    const db = getServiceRoleClient();
    const { data: threads, error } = await db.from('question_threads').select('*').eq('counselor_id', counselorId).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    let messages: unknown[] = [];
    if (threads.length) {
      const result = await db.from('thread_messages').select('*').in('thread_id', threads.map(t => t.id)).order('created_at', { ascending: true });
      if (result.error) throw result.error;
      messages = result.data;
    }
    return NextResponse.json({ success: true, threads, messages }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
