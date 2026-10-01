import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, signAdminSession } from '@/lib/adminSession';
import { allowRequest, requestIp } from '@/lib/rateLimit';
import { isSameOrigin, secureEqual } from '@/lib/serverSecurity';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  if (!(await allowRequest(`admin-login:${requestIp(request)}`, 8, 15 * 60_000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }
  let password: unknown;
  try {
    ({ password } = (await request.json()) as { password?: unknown });
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const validPassword = process.env.ADMIN_PASSWORD;

  if (!validPassword) {
    console.error('ADMIN_PASSWORD is not configured on the server');
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.error('SESSION_SECRET is not configured on the server');
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  if (typeof password !== 'string' || !secureEqual(password, validPassword)) {
    return NextResponse.json({ success: false, error: 'invalid_password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, signAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
