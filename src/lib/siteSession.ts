import crypto from 'crypto';

// Purpose is signed and verified, so site tokens cannot authorize admin APIs.
export const SITE_SESSION_COOKIE = 'rahnamo_site_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  return secret;
}

export function signSiteSession(): string {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = `site:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

export function verifySiteSession(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, hmac, extra] = token.split('.');
  if (!payload || !hmac || extra !== undefined || !/^site:\d+$/.test(payload)) return false;

  let expected: string;
  try {
    expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  } catch {
    return false;
  }

  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  const expiresAt = Number(payload.slice(5));
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
