import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { allowRequest, requestIp } from '@/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch {
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const [{ data: questions, error: questionError }, { data: answers, error: answerError }] = await Promise.all([
    supabase
      .from('forum_questions')
      .select('id, student_name_or_anonymous, category, title, body, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('forum_answers')
      .select('id, question_id, counselor_id, body, created_at, counselor:counselors(full_name)')
      .order('created_at', { ascending: true })
      .limit(1000),
  ]);

  if (questionError || answerError) {
    console.error('[FORUM_LIST_FAILED]', questionError || answerError);
    return NextResponse.json({ success: false, error: 'query_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, questions: questions || [], answers: answers || [] });
}

export async function POST(request: Request) {
  const ip = requestIp(request);
  if (!(await allowRequest(`forum-question:${ip}`, 5, 15 * 60 * 1000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const body = input as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const questionBody = typeof body.body === 'string' ? body.body.trim() : '';
  const isAnonymous = body.isAnonymous === true;

  if (
    (!isAnonymous && (name.length < 2 || name.length > 80)) ||
    !EMAIL_RE.test(email) ||
    email.length > 254 ||
    !category ||
    category.length > 80 ||
    title.length < 5 ||
    title.length > 160 ||
    questionBody.length < 10 ||
    questionBody.length > 4000
  ) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch {
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from('forum_questions')
    .insert({
      id,
      student_name_or_anonymous: isAnonymous ? 'Anonim' : name,
      email,
      category,
      title,
      body: questionBody,
    })
    .select('id, student_name_or_anonymous, category, title, body, created_at')
    .single();

  if (error || !data) {
    console.error('[FORUM_QUESTION_INSERT_FAILED]', error);
    return NextResponse.json({ success: false, error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, question: data }, { status: 201 });
}
