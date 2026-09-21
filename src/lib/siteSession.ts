import crypto from 'crypto';

// Same signed-expiry HMAC scheme as adminSession.ts, deliberately
// duplicated rather than shared -- a distinct cookie name and password
// keep the site-wide gate and the admin gate fully independent, even
// though both currently sign with the same SESSION_SECRET (safe: HMAC
// with one key for two unrelated payloads is standard).
export const SITE_SESSION_COOKIE = 'rahnamo_site_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  return secret;
}

export function signSiteSession(): string {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = String(expiresAt);
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

export function verifySiteSession(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, hmac] = token.split('.');
  if (!payload || !hmac) return false;

  let expected: string;
  try {
    expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  } catch {
    return false;
  }

  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  const expiresAt = parseInt(payload, 10);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
