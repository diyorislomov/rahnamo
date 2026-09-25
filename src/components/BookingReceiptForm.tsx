'use client';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2 } from 'lucide-react';
import PaymentInstructions from './PaymentInstructions';
import { studentAccessToken, StudentBooking } from './studentJourney';

export default function BookingReceiptForm({ booking, onSaved }: { booking: StudentBooking; onSaved: (booking: StudentBooking) => void }) {
  const t = useTranslations('journeys');
  const [receipt, setReceipt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);
  if (booking.payment_receipt) return <p className="text-sm text-emerald-800 flex items-center gap-2"><CheckCircle2 size={18} aria-hidden />{t('receiptSubmitted')}</p>;
  return <div className="space-y-4"><PaymentInstructions /><form onSubmit={async (e) => {
    e.preventDefault(); if (pending.current || !receipt.trim()) return;
    pending.current = true; setBusy(true); setError(false);
    try {
      const token = await studentAccessToken();
      const res = await fetch('/api/bookings/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ bookingId: booking.id, paymentReceipt: receipt.trim() }) });
      const data = await res.json();
      if (!res.ok || !data.success || !data.booking) throw new Error('receipt_failed');
      onSaved(data.booking);
    } catch { setError(true); }
    finally { pending.current = false; setBusy(false); }
  }} className="space-y-3"><label htmlFor={`receipt-${booking.id}`} className="ui-label">{t('receiptReference')}</label><input id={`receipt-${booking.id}`} className="ui-input" required maxLength={200} value={receipt} onChange={(e) => setReceipt(e.target.value)} /><p className="ui-muted text-sm">{t('receiptHelp')}</p>{error && <p className="ui-alert" role="alert">{t('receiptFailed')}</p>}<button className="ui-button w-full" disabled={busy || !receipt.trim()}>{busy && <Loader2 size={17} className="animate-spin" aria-hidden />}{t('submitReceipt')}</button></form></div>;
}
