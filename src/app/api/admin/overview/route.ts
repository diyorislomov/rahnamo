import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { postgres } from '@/lib/postgres';

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

  const [applications, questions, answers, survey, counselors, waitlist, metricResult] = await Promise.all([
    supabase.from('counselor_applications').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('forum_questions').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('forum_answers').select('*').order('created_at', { ascending: true }).limit(2000),
    supabase.from('survey_responses').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('counselors').select('*').order('joined_at', { ascending: false }).limit(500),
    postgres.query(
      `SELECT id, full_name, contact, goal, field, experience_level, locale, status, created_at
       FROM career_waitlist ORDER BY created_at DESC LIMIT 1000`
    ),
    postgres.query<{
      total_users: string;
      active_mentees: string;
      total_bookings: string;
      paid_gmv: string;
      completed_sessions: string;
      repeat_rate: string;
      waitlist_count: string;
    }>(
      `WITH per_user AS (
         SELECT user_id, count(*) AS booking_count FROM bookings
         WHERE status <> 'cancelled' GROUP BY user_id
       )
       SELECT
         (SELECT count(*)::text FROM users) AS total_users,
         (SELECT count(DISTINCT user_id)::text FROM bookings WHERE status <> 'cancelled' AND created_at >= now() - interval '30 days') AS active_mentees,
         (SELECT count(*)::text FROM bookings WHERE status <> 'cancelled') AS total_bookings,
         (SELECT COALESCE(sum(price), 0)::text FROM bookings WHERE payment_status = 'confirmed' AND status <> 'cancelled') AS paid_gmv,
         (SELECT count(*)::text FROM bookings WHERE status = 'completed') AS completed_sessions,
         (SELECT count(*)::text FROM career_waitlist) AS waitlist_count,
         COALESCE((SELECT round(100.0 * count(*) FILTER (WHERE booking_count >= 2) / NULLIF(count(*), 0), 1)::text FROM per_user), '0') AS repeat_rate`
    ),
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
    waitlist: waitlist.rows,
    metrics: {
      totalUsers: Number(metricResult.rows[0]?.total_users || 0),
      activeMentees: Number(metricResult.rows[0]?.active_mentees || 0),
      totalBookings: Number(metricResult.rows[0]?.total_bookings || 0),
      paidGmv: Number(metricResult.rows[0]?.paid_gmv || 0),
      completedSessions: Number(metricResult.rows[0]?.completed_sessions || 0),
      repeatRate: Number(metricResult.rows[0]?.repeat_rate || 0),
      activeMentors: counselors.data?.length || 0,
      waitlistCount: Number(metricResult.rows[0]?.waitlist_count || 0),
    },
  });
}
