import { beforeAll, describe, expect, it, vi } from 'vitest';
import { safeRedirectPath } from '../src/lib/safeRedirect';
import { amountInTiyin, clickPaymentUrl, clickSignature, verifyClickSignature, type ClickRequestFields } from '../src/lib/click';
import { isSameOrigin } from '../src/lib/serverSecurity';

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

describe('same-origin protection', () => {
  it('accepts the configured public origin behind a reverse proxy', () => {
    const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://myrahnamo.com';

    try {
      const request = new Request('http://127.0.0.1:3002/api/bookings', {
        headers: { origin: 'https://myrahnamo.com' },
      });
      expect(isSameOrigin(request)).toBe(true);
    } finally {
      if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  });

  it('rejects an unrelated origin', () => {
    const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://myrahnamo.com';

    try {
      const request = new Request('http://127.0.0.1:3002/api/bookings', {
        headers: { origin: 'https://evil.example' },
      });
      expect(isSameOrigin(request)).toBe(false);
    } finally {
      if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
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

describe('CLICK Shop API security', () => {
  const prepareFields: ClickRequestFields = {
    click_trans_id: '123',
    service_id: '456',
    click_paydoc_id: '555',
    merchant_trans_id: 'ORDER-1',
    amount: '10000.00',
    action: '0',
    error: '0',
    error_note: 'Success',
    sign_time: '2026-10-06 12:34:56',
    sign_string: 'e822675879ac8628d8898e202022e316',
  };

  it('matches the documented Prepare and Complete signature layouts', () => {
    expect(clickSignature(prepareFields, 'secret')).toBe('e822675879ac8628d8898e202022e316');
    expect(verifyClickSignature(prepareFields, 'secret')).toBe(true);
    expect(clickSignature({
      ...prepareFields,
      action: '1',
      merchant_prepare_id: '789',
      sign_time: '2026-10-06 12:35:00',
    }, 'secret')).toBe('08e2070212fff3fd85ff4ee9dc914bb2');
  });

  it('rejects a changed amount and parses money without floating point rounding', () => {
    expect(verifyClickSignature({ ...prepareFields, amount: '10001.00' }, 'secret')).toBe(false);
    expect(amountInTiyin('10000.05')).toBe(BigInt(1_000_005));
    expect(amountInTiyin('1.234')).toBeNull();
  });

  it('builds a checkout URL without exposing the secret key', () => {
    process.env.CLICK_SERVICE_ID = '456';
    process.env.CLICK_MERCHANT_ID = '789';
    process.env.CLICK_SECRET_KEY = 'never-in-the-url';
    const url = clickPaymentUrl({ bookingId: 'ORDER-1', amount: 10000, returnUrl: 'https://myrahnamo.com/my-bookings' });
    expect(url).toContain('https://my.click.uz/services/pay?');
    expect(url).toContain('transaction_param=ORDER-1');
    expect(url).not.toContain(process.env.CLICK_SECRET_KEY);
  });
});
