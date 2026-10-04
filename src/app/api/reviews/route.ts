import { NextResponse } from 'next/server';
import { resolveMenteeFromRequest } from '@/lib/menteeSession';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';

export async function GET(request: Request) {
  const counselorId = new URL(request.url).searchParams.get('counselorId');
  if (!counselorId || counselorId.length > 100) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }
  const result = await postgres.query(
    `SELECT id, booking_id, counselor_id, student_first_name, rating, review_text, created_at
     FROM reviews WHERE counselor_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [counselorId]
  );
  return NextResponse.json({ success: true, reviews: result.rows });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  const mentee = await resolveMenteeFromRequest(request);
  if (!mentee) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const bookingId = typeof input.bookingId === 'string' ? input.bookingId : '';
  const rating = Number(input.rating);
  const reviewText = typeof input.reviewText === 'string' ? input.reviewText.trim() : '';
  if (!bookingId || !Number.isInteger(rating) || rating < 1 || rating > 5 || reviewText.length < 10 || reviewText.length > 2000) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const booking = await postgres.query<{
    counselor_id: string;
    student_name: string;
  }>(
    `SELECT counselor_id, student_name FROM bookings
     WHERE id = $1 AND user_id = $2 AND status = 'completed'`,
    [bookingId, mentee.userId]
  );
  if (!booking.rows[0]) return NextResponse.json({ success: false, error: 'booking_not_reviewable' }, { status: 409 });

  const row = booking.rows[0];
  try {
    await postgres.query(
      `INSERT INTO reviews (booking_id, user_id, counselor_id, student_first_name, rating, review_text)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [bookingId, mentee.userId, row.counselor_id, row.student_name.trim().split(/\s+/)[0] || 'Mentee', rating, reviewText]
    );
  } catch (error) {
    const duplicate = Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
    return NextResponse.json({ success: false, error: duplicate ? 'already_reviewed' : 'insert_failed' }, { status: duplicate ? 409 : 500 });
  }
  return NextResponse.json({ success: true });
}
