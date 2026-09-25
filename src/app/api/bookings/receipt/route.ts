import { NextResponse } from 'next/server';
import { bodyOf, failure, HttpError, rateLimit, requireStudent, stringField } from '@/lib/server/http';

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireStudent(request);
    await rateLimit(request, 'receipt', 30, userId);
    const body = await bodyOf(request);
    const { data, error } = await db.from('bookings').update({ payment_receipt: stringField(body.paymentReceipt, 3, 200) })
      .eq('id', stringField(body.bookingId, 1, 100)).eq('student_auth_id', userId).eq('payment_status', 'pending').select('*').maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(409, 'booking_not_pending');
    return NextResponse.json({ success: true, booking: data });
  } catch (error) { return failure(error); }
}
