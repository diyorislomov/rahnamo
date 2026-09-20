import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, signAdminSession } from '@/lib/adminSession';

export async function POST(request: Request) {
  const { password } = await request.json();
  const validPassword = process.env.ADMIN_PASSWORD;

  // TEMPORARY DIAGNOSTIC -- remove once the Vercel login mismatch is
  // confirmed and fixed. Logs lengths only, never the actual values, so
  // this is safe to leave in Vercel's Function Logs in the meantime.
  console.log('[ADMIN_LOGIN_DIAG]', {
    envIsSet: typeof validPassword === 'string' && validPassword.length > 0,
    envLength: validPassword?.length ?? null,
    envTrimmedLength: validPassword?.trim().length ?? null,
    inputType: typeof password,
    inputLength: typeof password === 'string' ? password.length : null,
    inputTrimmedLength: typeof password === 'string' ? password.trim().length : null,
  });

  if (!validPassword) {
    console.error('ADMIN_PASSWORD is not configured on the server');
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  if (typeof password !== 'string' || password.trim() !== validPassword.trim()) {
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
