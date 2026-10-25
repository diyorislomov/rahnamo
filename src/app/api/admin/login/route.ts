import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, signAdminSession } from '@/lib/adminSession';
import { checkRateLimit, clearRateLimit, requestIp } from '@/lib/rateLimit';
import { isSameOrigin, secureEqual } from '@/lib/serverSecurity';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });

  // Read admin password strictly from environment variables without dynamic runtime file reads
  const validPassword = process.env.ADMIN_PASSWORD?.trim() || null;

  if (!validPassword) {
    console.error('ADMIN_PASSWORD is not configured on the server');
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.error('SESSION_SECRET is not configured on the server');
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  // Rate limit: 50 attempts in development, 10 in production per 15-minute window.
  const rateLimitKey = `admin-login:${requestIp(request)}`;
  const maxAttempts = process.env.NODE_ENV === 'production' ? 10 : 50;
  const limit = await checkRateLimit(rateLimitKey, maxAttempts, 15 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'rate_limited', retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  let password: unknown;
  try {
    ({ password } = (await request.json()) as { password?: unknown });
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  // Constant-time comparison using secureEqual (SHA-256 + crypto.timingSafeEqual)
  if (typeof password !== 'string' || !secureEqual(password.trim(), validPassword)) {
    return NextResponse.json({ success: false, error: 'invalid_password' }, { status: 401 });
  }

  await clearRateLimit(rateLimitKey);

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, signAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // Upgraded to 'strict' so session cookie is never sent with cross-site requests
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return response;
}
