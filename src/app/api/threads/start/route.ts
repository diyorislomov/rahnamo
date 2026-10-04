import { NextResponse } from 'next/server';
import { resolveMenteeFromRequest } from '@/lib/menteeSession';
import { allowRequest } from '@/lib/rateLimit';
import { postgres } from '@/lib/postgres';
import { supabase } from '@/lib/supabase';
import { isSameOrigin } from '@/lib/serverSecurity';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  const mentee = await resolveMenteeFromRequest(request);
  if (!mentee) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  if (!(await allowRequest(`thread-start:${mentee.userId}`, 6, 60 * 60 * 1000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const counselorId = typeof input.counselorId === 'string' ? input.counselorId : '';
  if (!counselorId || counselorId.length > 100) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const existing = await postgres.query(
    `SELECT id FROM question_threads
     WHERE counselor_id = $1 AND user_id = $2 AND payment_status <> 'closed' LIMIT 1`,
    [counselorId, mentee.userId]
  );
  if (existing.rows[0]) {
    return NextResponse.json({ success: false, error: 'thread_already_open', threadId: existing.rows[0].id }, { status: 409 });
  }

  const { data: counselor, error: counselorError } = await supabase
    .from('counselors')
    .select('id, full_name, headline, avatar_url, price_per_question, soft_cap')
    .eq('id', counselorId)
    .maybeSingle();
  if (counselorError || !counselor || counselor.price_per_question == null || counselor.price_per_question <= 0) {
    return NextResponse.json({ success: false, error: 'counselor_unavailable' }, { status: 404 });
  }

  const bookingId = crypto.randomUUID();
  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO bookings (
         id, user_id, counselor_id, counselor_name, counselor_headline, counselor_avatar,
         tier, price, payment_method, slot, student_name, email, phone, telegram,
         education, question, locale
       ) VALUES ($1, $2, $3, $4, $5, $6, 'text_qa', 0, 'payme', $7, $8, $9, '', '', '', $10, 'uz')`,
      [
        bookingId, mentee.userId, counselor.id, counselor.full_name, counselor.headline,
        counselor.avatar_url, 'Ochiq matnli maslahat', mentee.name || mentee.email?.split('@')[0] || 'Mentee',
        mentee.email || '', 'Matnli maslahat',
      ]
    );
    const threadResult = await client.query(
      `INSERT INTO question_threads (
         booking_id, counselor_id, user_id, price_per_question, soft_cap, age_confirmed_at
       ) VALUES ($1, $2, $3, $4, $5, now()) RETURNING *`,
      [bookingId, counselor.id, mentee.userId, counselor.price_per_question, counselor.soft_cap]
    );
    await client.query('COMMIT');
    const thread = threadResult.rows[0];
    return NextResponse.json({
      success: true,
      thread: { ...thread, student_auth_id: thread.user_id, device_id: thread.user_id },
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    const conflict = Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
    console.error('[TEXT_QA_START_FAILED]', error);
    return NextResponse.json({ success: false, error: conflict ? 'thread_already_open' : 'insert_failed' }, { status: conflict ? 409 : 500 });
  } finally {
    client.release();
  }
}
