import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { failure, requireAdmin } from '@/lib/server/http';
export async function GET() {
  try {
    await requireAdmin();
    const db = getServiceRoleClient();
    const tables = ['bookings', 'counselor_applications', 'forum_questions', 'forum_answers', 'survey_responses', 'counselors', 'question_threads'];
    const names = ['bookings', 'applications', 'forumQuestions', 'forumAnswers', 'surveyResponses', 'counselors', 'threads'];
    const results = await Promise.all(tables.map(table => db.from(table).select(table === 'question_threads' ? '*, booking:bookings(student_name,email,telegram), counselor:counselors(full_name,headline)' : '*').order('created_at', { ascending: false }).limit(1000)));
    const data: Record<string, unknown> = { success: true, truncated: results.some(result => (result.data?.length || 0) >= 1000) };
    results.forEach((result, index) => { if (result.error) throw result.error; data[names[index]] = result.data; });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
