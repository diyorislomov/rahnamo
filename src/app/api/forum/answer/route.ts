import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { questionId, counselorId, body, passcode } = await request.json();
  const validPasscode = process.env.COUNSELOR_PASSCODE;

  if (!validPasscode) {
    console.error('COUNSELOR_PASSCODE is not configured on the server');
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  if (typeof passcode !== 'string' || passcode !== validPasscode) {
    return NextResponse.json({ success: false, error: 'invalid_passcode' }, { status: 401 });
  }

  if (
    typeof questionId !== 'string' ||
    typeof counselorId !== 'string' ||
    typeof body !== 'string' ||
    body.trim().length < 5
  ) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const answer = { id, questionId, counselorId, body: body.trim(), createdAt };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseConfigured = !!supabaseUrl && !supabaseUrl.includes('placeholder');

  if (!supabaseConfigured) {
    // Local/demo environments without a real Supabase project: the passcode
    // still gates this, but there's nowhere server-side to persist to --
    // the client falls back to localStorage for the same reason the rest
    // of the forum does.
    return NextResponse.json({ success: true, persisted: false, answer });
  }

  const { error } = await supabase.from('forum_answers').insert({
    id,
    question_id: questionId,
    counselor_id: counselorId,
    body: body.trim(),
  });

  if (error) {
    console.warn('Forum answer insert error:', error);
    return NextResponse.json({ success: false, error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, persisted: true, answer });
}
