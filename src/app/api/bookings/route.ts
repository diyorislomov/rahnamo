import { NextResponse } from 'next/server';
import { bodyOf, emailField, failure, HttpError, rateLimit, requireStudent, stringField, uuidField } from '@/lib/server/http';
import { notifyBooking } from '@/lib/server/bookingNotifications';
import { isValidLocale } from '@/i18n/config';

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireStudent(request);
    const body = await bodyOf(request);
    const id = uuidField(body.id);
    const counselorId = stringField(body.counselorId, 1, 100);
    const slot = stringField(body.slot, 1, 200);
    if (!['standard', 'premium'].includes(String(body.tier))) throw new HttpError(400, 'invalid_tier');
    const { data: existing, error: readError } = await db.from('bookings').select('*').eq('id', id).maybeSingle();
    if (readError) throw readError;
    if (existing) {
      if (existing.student_auth_id !== userId || existing.counselor_id !== counselorId || existing.tier !== body.tier || existing.slot !== slot) throw new HttpError(409, 'idempotency_conflict');
      return NextResponse.json({ success: true, booking: existing });
    }
    await rateLimit(request, 'booking-create', 12, userId);
    const { data: counselor, error } = await db.from('counselors').select('*').eq('id', counselorId).single();
    if (error || !counselor) throw new HttpError(404, 'counselor_not_found');
    if (!Array.isArray(counselor.available_slots) || !counselor.available_slots.includes(slot)) throw new HttpError(409, 'slot_unavailable');
    const price = body.tier === 'premium' ? counselor.premium_price : counselor.standard_price;
    if (!Number.isSafeInteger(price) || price <= 0) throw new HttpError(409, 'invalid_price');
    const row = {
      id, student_auth_id: userId, device_id: userId, counselor_id: counselorId,
      counselor_name: counselor.full_name, counselor_headline: counselor.headline, counselor_avatar: counselor.avatar_url,
      tier: body.tier, price, slot, student_name: stringField(body.studentName, 3, 120), email: emailField(body.email),
      phone: stringField(body.phone, 0, 40), telegram: stringField(body.telegram, 0, 100), education: stringField(body.education, 0, 300),
      question: stringField(body.question, 5, 4000), payment_receipt: stringField(body.paymentReceipt, 0, 200) || null,
      payment_method: ['payme', 'click', 'uzum'].includes(String(body.paymentMethod)) ? body.paymentMethod : 'payme',
      payment_status: 'pending', status: 'confirmed', meet_link: null,
      locale: isValidLocale(typeof body.locale === 'string' ? body.locale : undefined) ? body.locale : 'uz',
    };
    const { data: booking, error: insertError } = await db.from('bookings').insert(row).select('*').single();
    if (insertError?.code === '23505') {
      const { data: retry } = await db.from('bookings').select('*').eq('id', id).eq('student_auth_id', userId).maybeSingle();
      if (retry && retry.counselor_id === counselorId && retry.tier === body.tier && retry.slot === slot) return NextResponse.json({ success: true, booking: retry });
      throw new HttpError(409, 'idempotency_conflict');
    }
    if (insertError || !booking) throw insertError || new Error('Insert failed');
    const notified = await notifyBooking(booking, 'booking_created');
    return NextResponse.json({ success: true, booking, ...(!notified && { warning: 'notification_unavailable' }) }, { status: 201 });
  } catch (error) { return failure(error); }
}
