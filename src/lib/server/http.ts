import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

export class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export function failure(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ success: false, error: error.code }, { status: error.status });
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (['P0001', '23503', '23505'].includes(code)) return NextResponse.json({ success: false, error: 'invalid_transition' }, { status: 409 });
  if (['23514', '22P02'].includes(code)) return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  // Log only the category, never submitted personal data, tokens, or provider responses.
  console.error('[SERVER_OPERATION_FAILED]', error instanceof Error ? error.name : 'DatabaseError');
  return NextResponse.json({ success: false, error: 'service_unavailable' }, { status: 503 });
}

export async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > 24_000) throw new HttpError(413, 'request_too_large');
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new HttpError(400, 'invalid_json'); }
}

export function stringField(value: unknown, min = 0, max = 1000): string {
  if (value == null && min === 0) return '';
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new HttpError(400, 'invalid_input');
  return value.trim();
}

export function emailField(value: unknown): string {
  const email = stringField(value, 3, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'invalid_email');
  return email;
}

export function positiveInteger(value: unknown, optional = false): number | null {
  if (optional && (value == null || value === '')) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 100_000_000) throw new HttpError(400, 'invalid_price');
  return value;
}

export function uuidField(value: unknown): string {
  const id = stringField(value, 36, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new HttpError(400, 'invalid_id');
  return id;
}

export function safeEqual(a: string, b: string) {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'invalid_origin');
}

export async function requireAdmin(request?: Request) {
  if (request) sameOrigin(request);
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(token)) throw new HttpError(401, 'unauthorized');
}

export async function requireStudent(request: Request) {
  sameOrigin(request);
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'unauthorized');
  const db = getServiceRoleClient();
  const { data, error } = await db.auth.getUser(header.slice(7));
  if (error || !data.user) throw new HttpError(401, 'unauthorized');
  return { db, userId: data.user.id };
}

export async function rateLimit(request: Request, scope: string, limit: number, identity?: string) {
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const key = createHash('sha256').update(`${scope}:${identity || ip}`).digest('hex');
  const { data, error } = await getServiceRoleClient().rpc('consume_api_limit', { p_key: key, p_limit: limit, p_window_seconds: 600 });
  if (error) throw new HttpError(503, 'service_unavailable');
  if (!data) throw new HttpError(429, 'too_many_requests');
}

export async function requireMentor(request: Request, counselorId: unknown, passcode: unknown) {
  sameOrigin(request);
  const id = stringField(counselorId, 1, 100);
  const code = stringField(passcode, 1, 200);
  // Includes successful polling, so blocked guesses cannot bypass the limit by
  // eventually submitting a valid credential. Allows two 5-second inbox polls.
  await rateLimit(request, 'mentor-access', 300);
  let mapping: Record<string, unknown>;
  try { mapping = JSON.parse(process.env.COUNSELOR_PASSCODES || '{}'); } catch { throw new HttpError(503, 'server_misconfigured'); }
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) throw new HttpError(503, 'server_misconfigured');
  const expected = Object.hasOwn(mapping, id) ? mapping[id] : undefined;
  if (typeof expected !== 'string' || expected.length < 12 || !safeEqual(code, expected)) {
    throw new HttpError(401, 'invalid_passcode');
  }
  return id;
}
