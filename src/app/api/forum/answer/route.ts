import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { bodyOf, failure, rateLimit, requireMentor, stringField, uuidField } from '@/lib/server/http';
export async function POST(request: Request) {
  try {
    const body = await bodyOf(request);
    const counselorId = await requireMentor(request, body.counselorId, body.passcode);
    await rateLimit(request, 'forum-answer', 40, counselorId);
    const { data, error } = await getServiceRoleClient().from('forum_answers').insert({ question_id: uuidField(body.questionId), counselor_id: counselorId, body: stringField(body.body, 5, 4000) }).select('*').single();
    if (error) throw error;
    return NextResponse.json({ success: true, persisted: true, answer: data }, { status: 201 });
  } catch (error) { return failure(error); }
}
