import { NextResponse } from 'next/server';
import { bodyOf, failure, HttpError, rateLimit, requireStudent, stringField } from '@/lib/server/http';

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireStudent(request);
    const body = await bodyOf(request);
    if (!Number.isInteger(body.rating) || Number(body.rating) < 1 || Number(body.rating) > 5) throw new HttpError(400, 'invalid_rating');
    await rateLimit(request, 'review', 15, userId);
    const { data, error } = await db.rpc('create_booking_review', { p_booking_id: stringField(body.bookingId, 1, 100), p_student_id: userId, p_rating: body.rating, p_text: stringField(body.text, 10, 2000) });
    if (error) throw error;
    return NextResponse.json({ success: true, review: data });
  } catch (error) { return failure(error); }
}
