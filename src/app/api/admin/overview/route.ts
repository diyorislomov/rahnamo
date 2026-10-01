import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

async function requireAdmin() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch {
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const [applications, questions, answers, survey, counselors] = await Promise.all([
    supabase.from('counselor_applications').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('forum_questions').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('forum_answers').select('*').order('created_at', { ascending: true }).limit(2000),
    supabase.from('survey_responses').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('counselors').select('*').order('joined_at', { ascending: false }).limit(500),
  ]);

  const failed = [applications, questions, answers, survey, counselors].find((result) => result.error);
  if (failed?.error) {
    console.error('[ADMIN_OVERVIEW_FAILED]', failed.error);
    return NextResponse.json({ success: false, error: 'query_failed' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    applications: applications.data || [],
    questions: questions.data || [],
    answers: answers.data || [],
    survey: survey.data || [],
    counselors: counselors.data || [],
  });
}
