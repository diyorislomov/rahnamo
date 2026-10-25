import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ADMIN_SESSION_COOKIE, signAdminSession } from '@/lib/adminSession';
import { allowRequest, requestIp } from '@/lib/rateLimit';
import { isSameOrigin, secureEqual } from '@/lib/serverSecurity';

function resolveAdminPassword(): string | null {
  const candidateFiles = [
    '.env.production.local',
    '.env.local',
    '.env.production',
    '.env',
  ];

  for (const filename of candidateFiles) {
    try {
      const envPath = path.join(process.cwd(), filename);
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (trimmed.startsWith('ADMIN_PASSWORD=')) {
            const val = trimmed.slice('ADMIN_PASSWORD='.length).trim().replace(/^["']|["']$/g, '');
            if (val) return val;
          }
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return process.env.ADMIN_PASSWORD?.trim() || null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });

  // Rate limit: 50 attempts in development, 10 in production
  const maxAttempts = process.env.NODE_ENV === 'production' ? 10 : 50;
  if (!(await allowRequest(`admin-login:${requestIp(request)}`, maxAttempts, 15 * 60_000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let password: unknown;
  try {
    ({ password } = (await request.json()) as { password?: unknown });
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const validPassword = resolveAdminPassword();

  if (!validPassword) {
    console.error('ADMIN_PASSWORD is not configured on the server');
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.error('SESSION_SECRET is not configured on the server');
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  if (typeof password !== 'string' || !secureEqual(password.trim(), validPassword)) {
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
