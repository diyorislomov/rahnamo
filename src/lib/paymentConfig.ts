const rawCard = process.env.NEXT_PUBLIC_PAYMENT_CARD_NUMBER || '';

export const paymentCardDigits = rawCard.replace(/\D/g, '');
export const paymentCardDisplay = paymentCardDigits.replace(/(.{4})/g, '$1 ').trim();
export const paymentCardOwner = process.env.NEXT_PUBLIC_PAYMENT_CARD_OWNER || '';
export const isPaymentConfigured = paymentCardDigits.length >= 16 && paymentCardOwner.length > 1;
