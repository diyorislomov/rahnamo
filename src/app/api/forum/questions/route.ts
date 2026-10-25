import { NextResponse } from 'next/server';
import { rows, insertRow } from '@/lib/database';
import { allowRequest, requestIp } from '@/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const [{ data: questions, error: questionError }, { data: answers, error: answerError }] = await Promise.all([
    rows('SELECT id,student_name_or_anonymous,category,title,body,created_at FROM forum_questions ORDER BY created_at DESC LIMIT 200'),
    rows(`SELECT a.id,a.question_id,a.counselor_id,a.body,a.created_at,json_build_object('full_name',c.full_name) AS counselor
          FROM forum_answers a JOIN counselors c ON c.id=a.counselor_id ORDER BY a.created_at LIMIT 1000`),
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

  const id = crypto.randomUUID();
  const { data, error } = await insertRow('forum_questions', {
      id,
      student_name_or_anonymous: isAnonymous ? 'Anonim' : name,
      email,
      category,
      title,
      body: questionBody,
    });

  if (error || !data) {
    console.error('[FORUM_QUESTION_INSERT_FAILED]', error);
    return NextResponse.json({ success: false, error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, question: { id: data.id, student_name_or_anonymous: data.student_name_or_anonymous, category: data.category, title: data.title, body: data.body, created_at: data.created_at } }, { status: 201 });
}
