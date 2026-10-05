import 'server-only';

import type { PoolClient } from 'pg';
import { postgres } from '@/lib/postgres';
import { sendBookingEmailById } from '@/lib/bookingEmail';
import {
  amountInTiyin,
  clickFields,
  CLICK_ERROR,
  CLICK_ERROR_NOTE,
  clickSecretKey,
  clickServiceId,
  type ClickAction,
  type ClickRequestFields,
  verifyClickSignature,
} from '@/lib/click';

type BookingRow = {
  id: string;
  price: number;
  payment_method: string;
  payment_status: string;
  status: string;
};

type ClickTransactionRow = {
  id: string;
  booking_id: string;
  click_trans_id: string;
  click_paydoc_id: string;
  amount: string;
  status: 'prepared' | 'paid' | 'cancelled';
};

function response(
  fields: Partial<ClickRequestFields>,
  error: number,
  idField?: 'merchant_prepare_id' | 'merchant_confirm_id',
  id?: string
) {
  return Response.json({
    click_trans_id: fields.click_trans_id || '',
    merchant_trans_id: fields.merchant_trans_id || '',
    ...(idField && id ? { [idField]: Number(id) } : {}),
    error,
    error_note: CLICK_ERROR_NOTE[error],
  });
}

async function bookingForUpdate(client: PoolClient, id: string): Promise<BookingRow | null> {
  const result = await client.query<BookingRow>(
    `SELECT id, price, payment_method, payment_status, status
     FROM bookings WHERE id = $1 FOR UPDATE`,
    [id]
  );
  return result.rows[0] || null;
}

function validateCommon(fields: ClickRequestFields, expectedAction: ClickAction): number | null {
  if (fields.action !== expectedAction) return CLICK_ERROR.ACTION_NOT_FOUND;
  if (fields.service_id !== clickServiceId()) return CLICK_ERROR.INVALID_REQUEST;
  if (!verifyClickSignature(fields, clickSecretKey())) return CLICK_ERROR.SIGN_FAILED;
  if (!/^-?\d+$/.test(fields.error)) return CLICK_ERROR.INVALID_REQUEST;
  return null;
}

async function prepare(fields: ClickRequestFields): Promise<Response> {
  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    const booking = await bookingForUpdate(client, fields.merchant_trans_id);
    if (!booking || booking.payment_method !== 'click') {
      await client.query('ROLLBACK');
      return response(fields, CLICK_ERROR.BOOKING_NOT_FOUND);
    }
    if (booking.status === 'cancelled') {
      await client.query('ROLLBACK');
      return response(fields, CLICK_ERROR.CANCELLED);
    }
    if (booking.payment_status === 'confirmed') {
      await client.query('ROLLBACK');
      return response(fields, CLICK_ERROR.ALREADY_PAID);
    }
    if (amountInTiyin(fields.amount) !== BigInt(booking.price) * BigInt(100)) {
      await client.query('ROLLBACK');
      return response(fields, CLICK_ERROR.INVALID_AMOUNT);
    }
    if (Number(fields.error) < 0) {
      await client.query('ROLLBACK');
      return response(fields, CLICK_ERROR.CANCELLED);
    }

    const existing = await client.query<ClickTransactionRow>(
      'SELECT * FROM click_transactions WHERE click_trans_id = $1 FOR UPDATE',
      [fields.click_trans_id]
    );
    const transaction = existing.rows[0];
    if (transaction) {
      await client.query('ROLLBACK');
      if (
        transaction.booking_id !== booking.id ||
        transaction.click_paydoc_id !== fields.click_paydoc_id ||
        amountInTiyin(transaction.amount) !== amountInTiyin(fields.amount)
      ) return response(fields, CLICK_ERROR.INVALID_REQUEST);
      if (transaction.status === 'cancelled') return response(fields, CLICK_ERROR.CANCELLED);
      if (transaction.status === 'paid') return response(fields, CLICK_ERROR.ALREADY_PAID);
      return response(fields, CLICK_ERROR.SUCCESS, 'merchant_prepare_id', transaction.id);
    }

    const inserted = await client.query<ClickTransactionRow>(
      `INSERT INTO click_transactions (
         booking_id, click_trans_id, click_paydoc_id, amount, status, prepared_at
       ) VALUES ($1, $2, $3, $4, 'prepared', now())
       ON CONFLICT (click_trans_id) DO NOTHING
       RETURNING *`,
      [booking.id, fields.click_trans_id, fields.click_paydoc_id, fields.amount]
    );
    if (!inserted.rows[0]) {
      const raced = await client.query<ClickTransactionRow>(
        'SELECT * FROM click_transactions WHERE click_trans_id = $1 FOR UPDATE',
        [fields.click_trans_id]
      );
      const transaction = raced.rows[0];
      await client.query('ROLLBACK');
      if (!transaction || transaction.booking_id !== booking.id || transaction.click_paydoc_id !== fields.click_paydoc_id) {
        return response(fields, CLICK_ERROR.INVALID_REQUEST);
      }
      if (transaction.status === 'cancelled') return response(fields, CLICK_ERROR.CANCELLED);
      if (transaction.status === 'paid') return response(fields, CLICK_ERROR.ALREADY_PAID);
      return response(fields, CLICK_ERROR.SUCCESS, 'merchant_prepare_id', transaction.id);
    }
    await client.query('COMMIT');
    return response(fields, CLICK_ERROR.SUCCESS, 'merchant_prepare_id', inserted.rows[0].id);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[CLICK_PREPARE_FAILED]', error);
    return response(fields, CLICK_ERROR.UPDATE_FAILED);
  } finally {
    client.release();
  }
}

async function complete(fields: ClickRequestFields): Promise<Response> {
  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    const transactionResult = await client.query<ClickTransactionRow>(
      `SELECT * FROM click_transactions
       WHERE id = $1 AND click_trans_id = $2 AND click_paydoc_id = $3 AND booking_id = $4
       FOR UPDATE`,
      [fields.merchant_prepare_id, fields.click_trans_id, fields.click_paydoc_id, fields.merchant_trans_id]
    );
    const transaction = transactionResult.rows[0];
    if (!transaction) {
      await client.query('ROLLBACK');
      return response(fields, CLICK_ERROR.TRANSACTION_NOT_FOUND);
    }
    if (transaction.status === 'cancelled') {
      await client.query('ROLLBACK');
      return response(fields, CLICK_ERROR.CANCELLED);
    }
    if (transaction.status === 'paid') {
      await client.query('ROLLBACK');
      return response(fields, CLICK_ERROR.ALREADY_PAID, 'merchant_confirm_id', transaction.id);
    }

    const booking = await bookingForUpdate(client, fields.merchant_trans_id);
    if (!booking || booking.payment_method !== 'click') {
      await client.query('ROLLBACK');
      return response(fields, CLICK_ERROR.BOOKING_NOT_FOUND);
    }
    if (amountInTiyin(fields.amount) !== BigInt(booking.price) * BigInt(100) || amountInTiyin(transaction.amount) !== BigInt(booking.price) * BigInt(100)) {
      await client.query('ROLLBACK');
      return response(fields, CLICK_ERROR.INVALID_AMOUNT);
    }
    if (booking.status === 'cancelled' || Number(fields.error) < 0) {
      await client.query(
        `UPDATE click_transactions
         SET status = 'cancelled', click_error = $1, error_note = $2, completed_at = now()
         WHERE id = $3`,
        [fields.error, fields.error_note, transaction.id]
      );
      await client.query('COMMIT');
      return response(fields, CLICK_ERROR.CANCELLED);
    }
    if (booking.payment_status === 'confirmed') {
      await client.query('ROLLBACK');
      return response(fields, CLICK_ERROR.ALREADY_PAID);
    }

    await client.query(
      `UPDATE click_transactions
       SET status = 'paid', click_error = 0, error_note = $1, completed_at = now()
       WHERE id = $2`,
      [fields.error_note || 'Success', transaction.id]
    );
    await client.query(
      `UPDATE bookings SET payment_status = 'confirmed'
       WHERE id = $1 AND payment_status = 'pending'`,
      [booking.id]
    );
    await client.query('COMMIT');
    const emailResult = await sendBookingEmailById('payment_confirmed', booking.id).catch((error) => {
      console.error('[CLICK_PAYMENT_EMAIL_FAILED]', error);
      return { success: false };
    });
    if (!emailResult.success) console.warn('[CLICK_PAYMENT_EMAIL_NOT_SENT]', booking.id);
    return response(fields, CLICK_ERROR.SUCCESS, 'merchant_confirm_id', transaction.id);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[CLICK_COMPLETE_FAILED]', error);
    return response(fields, CLICK_ERROR.UPDATE_FAILED);
  } finally {
    client.release();
  }
}

export async function handleClickShopRequest(request: Request, expectedAction: ClickAction): Promise<Response> {
  let fields: ClickRequestFields | null = null;
  try {
    fields = clickFields(await request.formData());
    if (!fields) return response({}, CLICK_ERROR.INVALID_REQUEST);
    const validationError = validateCommon(fields, expectedAction);
    if (validationError !== null) return response(fields, validationError);
    return expectedAction === '0' ? prepare(fields) : complete(fields);
  } catch (error) {
    console.error('[CLICK_CALLBACK_FAILED]', error);
    return response(fields || {}, CLICK_ERROR.UPDATE_FAILED);
  }
}
