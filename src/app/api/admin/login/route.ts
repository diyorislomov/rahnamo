import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, signAdminSession } from '@/lib/adminSession';
import { bodyOf, failure, HttpError, rateLimit, safeEqual, sameOrigin, stringField } from '@/lib/server/http';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { password } = await bodyOf(request);
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || !process.env.SESSION_SECRET) throw new HttpError(503, 'server_misconfigured');
    await rateLimit(request, 'admin-login', 12);
    if (!safeEqual(stringField(password, 1, 200), expected)) throw new HttpError(401, 'invalid_password');
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, signAdminSession(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 43200 });
    return response;
  } catch (error) { return failure(error); }
}
