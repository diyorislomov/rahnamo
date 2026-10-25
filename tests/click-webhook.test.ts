import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLICK_ERROR, clickSignature, type ClickRequestFields } from '../src/lib/click';

const { clientQuery, poolConnect } = vi.hoisted(() => {
  const clientQuery = vi.fn();
  const poolConnect = vi.fn().mockResolvedValue({
    query: clientQuery,
    release: vi.fn(),
  });
  return { clientQuery, poolConnect };
});

vi.mock('server-only', () => ({}));
vi.mock('../src/lib/postgres', () => ({
  postgres: {
    connect: poolConnect,
    query: clientQuery,
  },
}));
vi.mock('../src/lib/bookingEmail', () => ({
  sendBookingEmailById: vi.fn().mockResolvedValue({ success: true }),
}));

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, v);
  }
  return fd;
}

describe('CLICK Webhook Security & Idempotency', () => {
  beforeEach(() => {
    vi.stubEnv('CLICK_SERVICE_ID', '12345');
    vi.stubEnv('CLICK_MERCHANT_ID', '67890');
    vi.stubEnv('CLICK_SECRET_KEY', 'test_secret_key');
    clientQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('rejects a forged signature with SIGN_FAILED error code (-1)', async () => {
    const { handleClickShopRequest } = await import('../src/lib/clickShopApi');

    const fields: ClickRequestFields = {
      click_trans_id: '999',
      service_id: '12345',
      click_paydoc_id: '888',
      merchant_trans_id: 'BOOK-100',
      amount: '150000.00',
      action: '0',
      error: '0',
      error_note: 'Success',
      sign_time: '2026-10-26 12:00:00',
      sign_string: 'forged_fake_signature_hash',
    };

    const request = new Request('http://localhost/api/payments/click/prepare', {
      method: 'POST',
      body: makeFormData(fields as unknown as Record<string, string>),
    });

    const res = await handleClickShopRequest(request, '0');
    const body = await res.json();
    expect(body.error).toBe(CLICK_ERROR.SIGN_FAILED);
    expect(poolConnect).not.toHaveBeenCalled();
  });

  it('rejects an incorrect payment amount that does not match price_per_question * pack_size (-2)', async () => {
    const { handleClickShopRequest } = await import('../src/lib/clickShopApi');

    const bookingId = 'BOOK-TEXT-QA-1';
    // Mentor price_per_question = 50,000 UZS, pack of 3 questions = 150,000 UZS.
    // Attacker attempts to pay only 50,000.00 instead of 150,000.00.
    const forgedFields: ClickRequestFields = {
      click_trans_id: '999',
      service_id: '12345',
      click_paydoc_id: '888',
      merchant_trans_id: bookingId,
      amount: '50000.00',
      action: '0',
      error: '0',
      error_note: 'Success',
      sign_time: '2026-10-26 12:00:00',
      sign_string: '',
    };
    forgedFields.sign_string = clickSignature(forgedFields, 'test_secret_key');

    // Mock DB queries for prepare:
    // 1: BEGIN
    // 2: SELECT booking FOR UPDATE
    clientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: bookingId,
            price: 150000, // Real expected amount is 150,000 UZS
            payment_method: 'click',
            payment_status: 'pending',
            status: 'confirmed',
          },
        ],
      })
      .mockResolvedValueOnce({}); // ROLLBACK

    const request = new Request('http://localhost/api/payments/click/prepare', {
      method: 'POST',
      body: makeFormData(forgedFields as unknown as Record<string, string>),
    });

    const res = await handleClickShopRequest(request, '0');
    const body = await res.json();
    expect(body.error).toBe(CLICK_ERROR.INVALID_AMOUNT);
  });

  it('handles duplicate complete notification idempotently without duplicate processing (-4 ALREADY_PAID)', async () => {
    const { handleClickShopRequest } = await import('../src/lib/clickShopApi');

    const bookingId = 'BOOK-TEXT-QA-2';
    const completeFields: ClickRequestFields = {
      click_trans_id: '9999',
      service_id: '12345',
      click_paydoc_id: '8888',
      merchant_trans_id: bookingId,
      merchant_prepare_id: '12',
      amount: '150000.00',
      action: '1',
      error: '0',
      error_note: 'Success',
      sign_time: '2026-10-26 12:05:00',
      sign_string: '',
    };
    completeFields.sign_string = clickSignature(completeFields, 'test_secret_key');

    // Transaction is already 'paid'
    clientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: '12',
            booking_id: bookingId,
            click_trans_id: '9999',
            click_paydoc_id: '8888',
            amount: '150000.00',
            status: 'paid', // Already paid
          },
        ],
      })
      .mockResolvedValueOnce({}); // ROLLBACK

    const request = new Request('http://localhost/api/payments/click/complete', {
      method: 'POST',
      body: makeFormData(completeFields as unknown as Record<string, string>),
    });

    const res = await handleClickShopRequest(request, '1');
    const body = await res.json();
    expect(body.error).toBe(CLICK_ERROR.ALREADY_PAID);
    expect(body.merchant_confirm_id).toBe(12);
  });
});
