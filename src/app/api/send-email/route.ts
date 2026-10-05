import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { resolveMenteeFromRequest } from '@/lib/menteeSession';
import { allowRequest, requestIp } from '@/lib/rateLimit';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';
import { sendBookingEmailById, type BookingEmailKind } from '@/lib/bookingEmail';

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
    }
    if (!(await allowRequest(`email:${requestIp(request)}`, 20, 10 * 60_000))) {
      return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
    }

    const input = (await request.json()) as { kind?: BookingEmailKind; id?: unknown };
    const kind = input.kind || 'booking_created';
    const id = typeof input.id === 'string' ? input.id : '';
    if (!id || (kind !== 'booking_created' && kind !== 'payment_confirmed')) {
      return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
    }

    const bookingResult = await postgres.query<{ user_id: string; payment_status: string }>(
      'SELECT user_id, payment_status FROM bookings WHERE id = $1',
      [id]
    );
    const booking = bookingResult.rows[0];
    if (!booking) return NextResponse.json({ success: false, error: 'booking_not_found' }, { status: 404 });

    if (kind === 'booking_created') {
      const mentee = await resolveMenteeFromRequest(request);
      if (!mentee || booking.user_id !== mentee.userId) {
        return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
      }
    } else {
      const cookieStore = await cookies();
      const isAdmin = verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
      if (!isAdmin || booking.payment_status !== 'confirmed') {
        return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
      }
    }

    const result = await sendBookingEmailById(kind, id);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[EMAIL_API_FAILED]', error);
    return NextResponse.json({ success: false, error: 'email_failed' }, { status: 500 });
  }
}
