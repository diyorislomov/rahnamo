import { NextResponse } from 'next/server';
import { clickPaymentUrl } from '@/lib/click';
import { resolveMenteeFromRequest } from '@/lib/menteeSession';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';
import { allowRequest, requestIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  }
  const mentee = await resolveMenteeFromRequest(request);
  if (!mentee) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  if (!(await allowRequest(`click-checkout:${mentee.userId}:${requestIp(request)}`, 12, 10 * 60_000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let id = '';
  try {
    const input = (await request.json()) as { bookingId?: unknown };
    id = typeof input.bookingId === 'string' ? input.bookingId.trim() : '';
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  if (!id) return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });

  const result = await postgres.query<{ id: string; price: number }>(
    `SELECT id, price FROM bookings
     WHERE id = $1 AND user_id = $2 AND payment_method = 'click'
       AND payment_status = 'pending' AND status = 'confirmed'`,
    [id, mentee.userId]
  );
  const booking = result.rows[0];
  if (!booking) {
    return NextResponse.json({ success: false, error: 'booking_not_payable' }, { status: 409 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    return NextResponse.json({
      success: true,
      paymentUrl: clickPaymentUrl({
        bookingId: booking.id,
        amount: booking.price,
        returnUrl: `${baseUrl}/my-bookings?payment=click&booking=${encodeURIComponent(booking.id)}`,
      }),
    });
  } catch (error) {
    console.error('[CLICK_CHECKOUT_CONFIG_FAILED]', error);
    return NextResponse.json({ success: false, error: 'payment_not_configured' }, { status: 503 });
  }
}

