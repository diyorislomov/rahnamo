import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';

// Payment and booking changes require the signed admin session.
async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await postgres.query('SELECT * FROM bookings ORDER BY created_at DESC');
    return NextResponse.json({ success: true, bookings: result.rows });
  } catch (error) {
    console.error('[ADMIN_BOOKINGS_LIST_FAILED]', error);
    return NextResponse.json({ success: false, error: 'query_failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const { action, id } = input;
  if (typeof id !== 'string' || typeof action !== 'string' || !['confirm_payment', 'complete'].includes(action)) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const query = action === 'confirm_payment'
    ? `UPDATE bookings SET payment_status = 'confirmed'
       WHERE id = $1 AND payment_status = 'pending' AND payment_method <> 'click'
       RETURNING id, payment_status`
    : `UPDATE bookings SET status = 'completed' WHERE id = $1 AND payment_status = 'confirmed' AND status = 'confirmed' RETURNING id, status`;
  const result = await postgres.query(query, [id]);
  const booking = result.rows[0];
  if (!booking) {
    console.error('[ADMIN_BOOKING_ACTION_FAILED]', action, id);
    return NextResponse.json({ success: false, error: 'update_failed' }, { status: 409 });
  }
  return NextResponse.json({ success: true, booking });
}
