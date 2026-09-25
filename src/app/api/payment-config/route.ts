import { NextResponse } from 'next/server';

export async function GET() {
  const cardNumber = (process.env.PAYMENT_CARD_NUMBER || '').replace(/\s/g, '');
  const cardHolder = process.env.PAYMENT_CARD_HOLDER?.trim() || '';
  const configured = /^\d{16}$/.test(cardNumber) && cardHolder.length > 0;
  return NextResponse.json({ configured, cardNumber: configured ? cardNumber.replace(/(.{4})(?=.)/g, '$1 ') : '', cardHolder: configured ? cardHolder : '' }, { headers: { 'Cache-Control': 'no-store' } });
}
