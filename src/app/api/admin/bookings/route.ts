import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { notifyBooking } from '@/lib/server/bookingNotifications';
import { bodyOf, failure, HttpError, requireAdmin, stringField } from '@/lib/server/http';
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await bodyOf(request);
    if (!['confirm_payment', 'complete'].includes(String(body.action))) throw new HttpError(400, 'invalid_action');
    const { data, error } = await getServiceRoleClient().rpc('admin_update_booking', { p_booking_id: stringField(body.bookingId, 1, 100), p_action: body.action, p_meet_link: `https://meet.jit.si/rahnamo-${randomUUID()}` });
    if (error) throw error;
    if (!data?.booking) throw new HttpError(409, 'invalid_transition');
    const notified = body.action !== 'confirm_payment' || await notifyBooking(data.booking, 'payment_confirmed');
    return NextResponse.json({ success: true, booking: data.booking, ...(notified ? {} : { warning: 'notification_unavailable' }) });
  } catch (error) { return failure(error); }
}
