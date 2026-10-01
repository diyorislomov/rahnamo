import 'server-only';
import { getServiceRoleClient } from './supabaseServiceRole';

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
    const { data, error } = await getServiceRoleClient().rpc('consume_api_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    });
    if (error) {
      console.error('[DISTRIBUTED_RATE_LIMIT_FAILED]', error.code);
      return process.env.NODE_ENV !== 'production';
    }
    return data === true;
  } catch {
    return process.env.NODE_ENV !== 'production';
  }
}
