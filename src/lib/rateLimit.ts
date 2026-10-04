import 'server-only';
import { postgres } from './postgres';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function requestIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function allowLocalRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size >= MAX_BUCKETS) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    if (buckets.size >= MAX_BUCKETS && !buckets.has(key)) return false;
  }
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export async function allowRequest(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!allowLocalRequest(key, limit, windowMs)) return false;

  try {
    const result = await postgres.query<{ count: number }>(
      `INSERT INTO api_rate_limits (key, count, reset_at)
       VALUES ($1, 1, now() + ($3 * interval '1 millisecond'))
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN api_rate_limits.reset_at <= now() THEN 1 ELSE api_rate_limits.count + 1 END,
         reset_at = CASE WHEN api_rate_limits.reset_at <= now() THEN now() + ($3 * interval '1 millisecond') ELSE api_rate_limits.reset_at END
       WHERE api_rate_limits.reset_at <= now() OR api_rate_limits.count < $2
       RETURNING count`,
      [key, limit, windowMs]
    );
    return result.rowCount === 1;
  } catch (error) {
    console.error('[DISTRIBUTED_RATE_LIMIT_FAILED]', error);
    return process.env.NODE_ENV !== 'production';
  }
}
