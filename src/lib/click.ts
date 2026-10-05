import 'server-only';

import crypto from 'node:crypto';
import { secureEqual } from './serverSecurity';

export type ClickAction = '0' | '1';

export type ClickRequestFields = {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string;
  amount: string;
  action: string;
  error: string;
  error_note: string;
  sign_time: string;
  sign_string: string;
};

export const CLICK_ERROR = {
  SUCCESS: 0,
  SIGN_FAILED: -1,
  INVALID_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  BOOKING_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  UPDATE_FAILED: -7,
  INVALID_REQUEST: -8,
  CANCELLED: -9,
} as const;

export const CLICK_ERROR_NOTE: Record<number, string> = {
  [CLICK_ERROR.SUCCESS]: 'Success',
  [CLICK_ERROR.SIGN_FAILED]: 'SIGN CHECK FAILED!',
  [CLICK_ERROR.INVALID_AMOUNT]: 'Incorrect parameter amount',
  [CLICK_ERROR.ACTION_NOT_FOUND]: 'Action not found',
  [CLICK_ERROR.ALREADY_PAID]: 'Already paid',
  [CLICK_ERROR.BOOKING_NOT_FOUND]: 'User does not exist',
  [CLICK_ERROR.TRANSACTION_NOT_FOUND]: 'Transaction does not exist',
  [CLICK_ERROR.UPDATE_FAILED]: 'Failed to update user',
  [CLICK_ERROR.INVALID_REQUEST]: 'Error in request from click',
  [CLICK_ERROR.CANCELLED]: 'Transaction cancelled',
};

function requiredEnv(name: 'CLICK_SERVICE_ID' | 'CLICK_MERCHANT_ID' | 'CLICK_SECRET_KEY'): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function clickServiceId(): string {
  return requiredEnv('CLICK_SERVICE_ID');
}

export function clickSecretKey(): string {
  return requiredEnv('CLICK_SECRET_KEY');
}

export function clickSignature(fields: ClickRequestFields, secretKey: string): string {
  const prepareId = fields.action === '1' ? fields.merchant_prepare_id || '' : '';
  const source = [
    fields.click_trans_id,
    fields.service_id,
    secretKey,
    fields.merchant_trans_id,
    prepareId,
    fields.amount,
    fields.action,
    fields.sign_time,
  ].join('');
  return crypto.createHash('md5').update(source).digest('hex');
}

export function verifyClickSignature(fields: ClickRequestFields, secretKey: string): boolean {
  return secureEqual(clickSignature(fields, secretKey).toLowerCase(), fields.sign_string.toLowerCase());
}

export function amountInTiyin(value: string | number): bigint | null {
  const raw = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ''] = raw.split('.');
  try {
    return BigInt(whole) * BigInt(100) + BigInt((fraction + '00').slice(0, 2));
  } catch {
    return null;
  }
}

export function clickPaymentUrl(input: {
  bookingId: string;
  amount: number;
  returnUrl?: string;
}): string {
  const url = new URL('https://my.click.uz/services/pay');
  url.searchParams.set('service_id', clickServiceId());
  url.searchParams.set('merchant_id', requiredEnv('CLICK_MERCHANT_ID'));
  url.searchParams.set('amount', input.amount.toFixed(2));
  url.searchParams.set('transaction_param', input.bookingId);
  url.searchParams.set(
    'return_url',
    input.returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://myrahnamo.com'}/my-bookings?payment=click`
  );
  return url.toString();
}

export function clickFields(formData: FormData): ClickRequestFields | null {
  const get = (key: keyof ClickRequestFields) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  };
  const fields: ClickRequestFields = {
    click_trans_id: get('click_trans_id'),
    service_id: get('service_id'),
    click_paydoc_id: get('click_paydoc_id'),
    merchant_trans_id: get('merchant_trans_id'),
    merchant_prepare_id: get('merchant_prepare_id') || undefined,
    amount: get('amount'),
    action: get('action'),
    error: get('error'),
    error_note: get('error_note'),
    sign_time: get('sign_time'),
    sign_string: get('sign_string'),
  };
  const required: Array<keyof ClickRequestFields> = [
    'click_trans_id', 'service_id', 'click_paydoc_id', 'merchant_trans_id', 'amount',
    'action', 'error', 'sign_time', 'sign_string',
  ];
  if (required.some((key) => !fields[key])) return null;
  if (fields.action === '1' && !fields.merchant_prepare_id) return null;
  return fields;
}
