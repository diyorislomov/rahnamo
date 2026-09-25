import { NextResponse } from 'next/server';
import { bodyOf, failure, HttpError, rateLimit, requireStudent, stringField, uuidField } from '@/lib/server/http';
import { isValidLocale } from '@/i18n/config';

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireStudent(request);
    const body = await bodyOf(request);
    if (body.ageConfirmed !== true) throw new HttpError(400, 'age_confirmation_required');
    await rateLimit(request, 'thread-start', 15, userId);
    const { data, error } = await db.rpc('start_question_thread', {
      p_booking_id: uuidField(body.id), p_counselor_id: stringField(body.counselorId, 1, 100), p_student_id: userId,
      p_locale: isValidLocale(typeof body.locale === 'string' ? body.locale : undefined) ? body.locale : 'uz',
    });
    if (error) throw error;
    return NextResponse.json({ success: true, ...data });
  } catch (error) { return failure(error); }
}
