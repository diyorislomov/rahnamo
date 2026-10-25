import 'server-only';
import { postgres } from './postgres';

type Bucket = { count: number; resetAt: number };
export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function requestIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function rememberBucket(key: string, bucket: Bucket): boolean {
  const now = Date.now();
  if (buckets.size >= MAX_BUCKETS && !buckets.has(key)) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    if (buckets.size >= MAX_BUCKETS && !buckets.has(key)) return false;
  }
  buckets.set(key, bucket);
  return true;
}

function checkLocalRequest(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(key);
  if (current && current.resetAt > now && current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  const next = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + windowMs }
    : { ...current, count: current.count + 1 };
  const allowed = rememberBucket(key, next);
  return { allowed, retryAfterSeconds: allowed ? 0 : Math.ceil(windowMs / 1000) };
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (!process.env.DATABASE_URL) {
    return checkLocalRequest(key, limit, windowMs);
  }

  try {
    const result = await postgres.query<{ count: number; reset_at: Date; allowed: boolean; retry_after_seconds: number }>(
      `INSERT INTO api_rate_limits (key, count, reset_at)
       VALUES ($1, 1, now() + ($3 * interval '1 millisecond'))
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN api_rate_limits.reset_at <= now() THEN 1 ELSE LEAST(api_rate_limits.count + 1, $2 + 1) END,
         reset_at = CASE WHEN api_rate_limits.reset_at <= now() THEN now() + ($3 * interval '1 millisecond') ELSE api_rate_limits.reset_at END
       RETURNING count, reset_at, count <= $2 AS allowed,
         GREATEST(1, ceil(extract(epoch FROM (reset_at - now()))))::int AS retry_after_seconds`,
      [key, limit, windowMs]
    );
    const row = result.rows[0];
    // PostgreSQL owns the window; a process restart must not create a second,
    // longer lockout. Mirror its state only for a database-outage fallback.
    rememberBucket(key, { count: row.count, resetAt: new Date(row.reset_at).getTime() });
    return { allowed: row.allowed, retryAfterSeconds: row.allowed ? 0 : row.retry_after_seconds };
  } catch (error) {
    console.warn('[DISTRIBUTED_RATE_LIMIT_FALLBACK] Falling back to local in-memory limiter:', error);
    return checkLocalRequest(key, limit, windowMs);
  }
}

export async function allowRequest(key: string, limit: number, windowMs: number): Promise<boolean> {
  return (await checkRateLimit(key, limit, windowMs)).allowed;
}

export async function clearRateLimit(key: string): Promise<void> {
  buckets.delete(key);
  if (!process.env.DATABASE_URL) return;
  try {
    await postgres.query('DELETE FROM api_rate_limits WHERE key=$1', [key]);
  } catch (error) {
    console.warn('[RATE_LIMIT_RESET_FAILED]', error);
  }
}
