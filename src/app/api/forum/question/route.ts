import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { bodyOf, emailField, failure, rateLimit, sameOrigin, stringField } from '@/lib/server/http';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await bodyOf(request);
    await rateLimit(request, 'forum-question', 8);
    const row = { student_name_or_anonymous: stringField(body.student_name_or_anonymous, 1, 100), email: emailField(body.email), category: stringField(body.category, 1, 100), title: stringField(body.title, 5, 180), body: stringField(body.body, 10, 4000) };
    const { data, error } = await getServiceRoleClient().from('forum_questions').insert(row).select('id,student_name_or_anonymous,category,title,body,created_at').single();
    if (error) throw error;
    return NextResponse.json({ success: true, question: data }, { status: 201 });
  } catch (error) { return failure(error); }
}
