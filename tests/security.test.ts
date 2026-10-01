import { beforeAll, describe, expect, it, vi } from 'vitest';
import { safeRedirectPath } from '../src/lib/safeRedirect';

vi.mock('server-only', () => ({}));

describe('safeRedirectPath', () => {
  it('keeps local application paths', () => {
    expect(safeRedirectPath('/counselors/abc?tab=text', '/')).toBe('/counselors/abc?tab=text');
  });

  it('rejects external and protocol-relative redirects', () => {
    expect(safeRedirectPath('https://evil.example', '/my-bookings')).toBe('/my-bookings');
    expect(safeRedirectPath('//evil.example', '/my-bookings')).toBe('/my-bookings');
    expect(safeRedirectPath('/\\evil.example', '/my-bookings')).toBe('/my-bookings');
  });
});

describe('signed session domains', () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
  });

  it('does not accept an admin token as a site token or vice versa', async () => {
    const admin = await import('../src/lib/adminSession');
    const site = await import('../src/lib/siteSession');
    const adminToken = admin.signAdminSession();
    const siteToken = site.signSiteSession();

    expect(admin.verifyAdminSession(adminToken)).toBe(true);
    expect(site.verifySiteSession(siteToken)).toBe(true);
    expect(admin.verifyAdminSession(siteToken)).toBe(false);
    expect(site.verifySiteSession(adminToken)).toBe(false);
  });
});
