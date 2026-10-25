import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../src/lib/postgres', () => ({ postgres: { query } }));

const key = 'admin-login:192.0.2.19';
const windowMs = 15 * 60_000;

beforeEach(() => {
  vi.resetModules();
  query.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-25T10:00:00Z'));
  vi.stubEnv('DATABASE_URL', '');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('login rate limits', () => {
  it('keeps the original local deadline when blocked requests repeat', async () => {
    const { checkRateLimit } = await import('../src/lib/rateLimit');
    for (let attempt = 0; attempt < 10; attempt++) {
      expect((await checkRateLimit(key, 10, windowMs)).allowed).toBe(true);
    }
    vi.advanceTimersByTime(100_500);
    expect(await checkRateLimit(key, 10, windowMs)).toEqual({ allowed: false, retryAfterSeconds: 800 });
    vi.advanceTimersByTime(windowMs - 100_500);
    expect(await checkRateLimit(key, 10, windowMs)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(query).not.toHaveBeenCalled();
  });

  it('uses the database deadline instead of extending it with a stale local lockout', async () => {
    const { checkRateLimit } = await import('../src/lib/rateLimit');
    for (let attempt = 0; attempt < 10; attempt++) await checkRateLimit(key, 10, windowMs);
    expect((await checkRateLimit(key, 10, windowMs)).allowed).toBe(false);

    vi.stubEnv('DATABASE_URL', 'postgresql://test.invalid/rahnamo_test');
    query.mockResolvedValueOnce({ rows: [{ count: 1, reset_at: new Date(Date.now() + windowMs), allowed: true, retry_after_seconds: 900 }] });
    expect(await checkRateLimit(key, 10, windowMs)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(query).toHaveBeenCalledWith(expect.any(String), [key, 10, windowMs]);
  });

  it('preserves the database lockout and its expiry during a database outage', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test.invalid/rahnamo_test');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    query.mockResolvedValueOnce({ rows: [{ count: 11, reset_at: new Date(Date.now() + 20_000), allowed: false, retry_after_seconds: 20 }] });
    const { checkRateLimit } = await import('../src/lib/rateLimit');
    expect(await checkRateLimit(key, 10, windowMs)).toEqual({ allowed: false, retryAfterSeconds: 20 });

    query.mockRejectedValue(new Error('database unavailable'));
    vi.advanceTimersByTime(5_000);
    expect(await checkRateLimit(key, 10, windowMs)).toEqual({ allowed: false, retryAfterSeconds: 15 });
    vi.advanceTimersByTime(15_000);
    expect(await checkRateLimit(key, 10, windowMs)).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it('clears only the successful login counter in both storage layers', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test.invalid/rahnamo_test');
    query.mockResolvedValue({ rows: [{ count: 10, reset_at: new Date(Date.now() + windowMs), allowed: true, retry_after_seconds: 900 }] });
    const { checkRateLimit, clearRateLimit, allowRequest } = await import('../src/lib/rateLimit');
    await checkRateLimit(key, 10, windowMs);
    await checkRateLimit('another-client', 10, windowMs);
    await clearRateLimit(key);
    expect(query).toHaveBeenLastCalledWith('DELETE FROM api_rate_limits WHERE key=$1', [key]);

    vi.stubEnv('DATABASE_URL', '');
    expect(await allowRequest(key, 10, windowMs)).toBe(true);
    expect(await allowRequest('another-client', 10, windowMs)).toBe(false);
  });
});
