/**
 * Payment Gateway Integration Utility for Uzbekistan
 * Supports Payme, Click, and Uzum Pay Merchant Checkout
 */

export interface PaymentParams {
  bookingId: string;
  amount: number; // in UZS (e.g. 50000)
  counselorName: string;
  studentName: string;
  email: string;
}

/**
 * Generate Payme Merchant Checkout Redirect URL
 * Payme requires Base64 encoded payload: m=merchant_id;ac.order_id=bookingId;a=amount_in_tiyin
 */
export function generatePaymeCheckoutUrl(params: PaymentParams): string {
  const merchantId = process.env.NEXT_PUBLIC_PAYME_MERCHANT_ID || '64a7c89f1092a40012345678';
  const amountInTiyin = params.amount * 100; // 1 UZS = 100 tiyin
  
  // Payload string: m=MERCHANT_ID;ac.booking_id=RNM-1234;a=5000000
  const rawParams = `m=${merchantId};ac.booking_id=${params.bookingId};a=${amountInTiyin}`;
  
  let base64Params = '';
  if (typeof window !== 'undefined') {
    base64Params = btoa(rawParams);
  } else {
    base64Params = Buffer.from(rawParams).toString('base64');
  }

  const isTest = process.env.NEXT_PUBLIC_PAYMENT_ENV !== 'production';
  const baseUrl = isTest ? 'https://test.paycom.uz' : 'https://checkout.paycom.uz';
  
  return `${baseUrl}/${base64Params}`;
}

/**
 * Generate Click Merchant Checkout Redirect URL
 */
export function generateClickCheckoutUrl(params: PaymentParams): string {
  const merchantId = process.env.NEXT_PUBLIC_CLICK_MERCHANT_ID || '12345';
  const serviceId = process.env.NEXT_PUBLIC_CLICK_SERVICE_ID || '67890';
  const returnUrl = typeof window !== 'undefined' ? `${window.location.origin}/my-bookings` : 'https://rahnamo-one.vercel.app/my-bookings';

  const searchParams = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: params.amount.toString(),
    transaction_param: params.bookingId,
    return_url: returnUrl,
  });

  return `https://my.click.uz/services/pay?${searchParams.toString()}`;
}

/**
 * Generate Uzum Pay Checkout Link
 */
export function generateUzumCheckoutUrl(params: PaymentParams): string {
  const merchantId = process.env.NEXT_PUBLIC_UZUM_MERCHANT_ID || 'rahnamo_uzum';
  return `https://uzumbank.uz/pay?merchant=${merchantId}&order=${params.bookingId}&amount=${params.amount}`;
}
