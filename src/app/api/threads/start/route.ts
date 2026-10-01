import { NextResponse } from 'next/server';
import { resolveMenteeFromRequest } from '@/lib/menteeSession';
import { allowRequest } from '@/lib/rateLimit';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

export async function POST(request: Request) {
  const mentee = await resolveMenteeFromRequest(request);
  if (!mentee) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!(await allowRequest(`thread-start:${mentee.userId}`, 6, 60 * 60 * 1000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const counselorId = (input as Record<string, unknown>).counselorId;
  if (typeof counselorId !== 'string' || !counselorId || counselorId.length > 100) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch {
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const [{ data: counselor, error: counselorError }, { data: existing }] = await Promise.all([
    supabase
      .from('counselors')
      .select('id, full_name, headline, avatar_url, price_per_question')
      .eq('id', counselorId)
      .maybeSingle(),
    supabase
      .from('question_threads')
      .select('id')
      .eq('counselor_id', counselorId)
      .eq('student_auth_id', mentee.userId)
      .neq('payment_status', 'closed')
      .limit(1)
      .maybeSingle(),
  ]);

  if (existing) {
    return NextResponse.json({ success: false, error: 'thread_already_open', threadId: existing.id }, { status: 409 });
  }
  if (counselorError || !counselor || counselor.price_per_question == null || counselor.price_per_question <= 0) {
    return NextResponse.json({ success: false, error: 'counselor_unavailable' }, { status: 404 });
  }

  const bookingId = crypto.randomUUID();
  const { error: bookingError } = await supabase.from('bookings').insert({
    id: bookingId,
    device_id: mentee.userId,
    mentee_auth_id: mentee.userId,
    counselor_id: counselor.id,
    counselor_name: counselor.full_name,
    counselor_headline: counselor.headline,
    counselor_avatar: counselor.avatar_url,
    tier: 'text_qa',
    price: 0,
    payment_method: 'payme',
    slot: 'Ochiq matnli maslahat',
    student_name: mentee.email?.split('@')[0] || 'Mentee',
    email: mentee.email || '',
    phone: '',
    telegram: '',
    education: '',
    question: 'Matnli maslahat',
    payment_status: 'pending',
    status: 'confirmed',
  });

  if (bookingError) {
    console.error('[TEXT_QA_BOOKING_INSERT_FAILED]', bookingError);
    return NextResponse.json({ success: false, error: 'booking_insert_failed' }, { status: 500 });
  }

  const { data: thread, error: threadError } = await supabase
    .from('question_threads')
    .insert({
      booking_id: bookingId,
      counselor_id: counselor.id,
      student_auth_id: mentee.userId,
      device_id: mentee.userId,
      age_confirmed_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (threadError || !thread) {
    await supabase.from('bookings').delete().eq('id', bookingId);
    console.error('[TEXT_QA_THREAD_INSERT_FAILED]', threadError);
    const conflict = threadError?.code === '23505';
    return NextResponse.json(
      { success: false, error: conflict ? 'thread_already_open' : 'thread_insert_failed' },
      { status: conflict ? 409 : 500 }
    );
  }

  return NextResponse.json({ success: true, thread }, { status: 201 });
}
