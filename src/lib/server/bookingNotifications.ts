import 'server-only';
import { sendBookingEmail } from '@/lib/bookingEmail';
import { sendTelegramText } from '@/lib/telegram';

export interface BookingRow {
  id: string; student_auth_id: string; counselor_id: string; counselor_name: string;
  student_name: string; email: string; tier: string; price: number; slot: string;
  payment_method: string; payment_status: string; payment_receipt: string | null;
  meet_link: string | null; status: string; locale: string;
}

export async function notifyBooking(row: BookingRow, kind: 'booking_created' | 'payment_confirmed') {
  const email = sendBookingEmail({ kind, id: row.id, studentName: row.student_name, counselorName: row.counselor_name, email: row.email, tier: row.tier, price: row.price, slot: row.slot, paymentMethod: row.payment_method, meetLink: row.meet_link || undefined, locale: row.locale });
  const telegram = kind === 'booking_created'
    ? sendTelegramText(`New booking: ${row.id}\nMentor: ${row.counselor_name}\nStudent: ${row.student_name}\nRequested time: ${row.slot}\nPrice: ${row.price} UZS\nPayment reference: ${row.payment_receipt || 'Not submitted'}\nReview in the admin dashboard.`)
    : Promise.resolve(true);
  const results = await Promise.all([email, telegram]);
  return results.every(Boolean);
}
