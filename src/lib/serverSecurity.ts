import 'server-only';
import crypto from 'crypto';

// Both hosts terminate at the same trusted proxy and serve this application.
const productionOrigins = new Set(['https://myrahnamo.com', 'https://www.myrahnamo.com']);

export function secureEqual(left: string, right: string): boolean {
  const leftDigest = crypto.createHash('sha256').update(left).digest();
  const rightDigest = crypto.createHash('sha256').update(right).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const requestOrigin = new URL(request.url).origin;
    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
      : null;

    return origin === requestOrigin || origin === configuredOrigin || (
      configuredOrigin !== null && productionOrigins.has(configuredOrigin) && productionOrigins.has(origin)
    );
  } catch {
    return false;
  }
}
