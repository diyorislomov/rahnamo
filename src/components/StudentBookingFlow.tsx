'use client';

import { formatInteger } from '@/lib/format';
import { createRequestId } from '@/lib/uuid';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Loader2, Video } from 'lucide-react';
import { Counselor } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabase';
import PaymentInstructions from './PaymentInstructions';
import BookingReceiptForm from './BookingReceiptForm';
import { saveDemoBooking, studentAccessToken, StudentBooking } from './studentJourney';

export default function StudentBookingFlow({ counselor }: { counselor: Counselor }) {
  const t = useTranslations('journeys');
  const locale = useLocale();
  const demo = !isSupabaseConfigured();
  const [step, setStep] = useState(1);
  const [tier, setTier] = useState<'standard' | 'premium'>('standard');
  const [slot, setSlot] = useState('');
  const [form, setForm] = useState({ studentName: '', email: '', phone: '', telegram: '', education: '', question: '', paymentReceipt: '' });
  const [paymentMethod, setPaymentMethod] = useState<'payme' | 'click' | 'uzum'>('payme');
  const [paymentReady, setPaymentReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [saved, setSaved] = useState<StudentBooking | null>(null);
  const pending = useRef(false);
  const request = useRef<{ id: string; signature: string } | null>(null);
  const price = tier === 'standard' ? counselor.standardPrice : counselor.premiumPrice;
  const field = (name: keyof typeof form, value: string) => setForm((f) => ({ ...f, [name]: value }));

  async function submit() {
    if (pending.current || (!demo && !paymentReady)) return;
    pending.current = true; setSubmitting(true); setError('');
    const payload = { counselorId: counselor.id, tier, slot, ...form, paymentMethod, locale };
    const signature = JSON.stringify(payload);
    try {
      if (request.current?.signature !== signature) request.current = { id: createRequestId(), signature };
      const id = request.current.id;
      if (demo) {
        const booking: StudentBooking = { id, counselor_id: counselor.id, counselor_name: counselor.fullName, counselor_headline: counselor.headline, counselor_avatar: counselor.avatarUrl, tier, price, slot, student_name: form.studentName, email: form.email, payment_method: paymentMethod, payment_status: 'pending', status: 'confirmed', created_at: new Date().toISOString(), demo: true };
        saveDemoBooking(booking); setSaved(booking);
      } else {
        const token = await studentAccessToken();
        const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, ...payload }) });
        const data = await res.json();
        if (!res.ok || !data.success || !data.booking) throw new Error(data.error || 'save_failed');
        setSaved(data.booking); if (data.warning) setWarning(t('notificationWarning'));
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(code.includes('slot') ? t('slotTaken') : t('bookingFailed'));
    } finally { pending.current = false; setSubmitting(false); }
  }

  if (saved) return <section className="ui-panel p-6 sm:p-8 space-y-5" aria-live="polite">
    <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center"><CheckCircle2 size={28} aria-hidden /></div>
    <div><p className="ui-eyebrow">{demo ? t('demoBadge') : t('requestSaved')}</p><h2 className="mt-2 text-2xl font-serif font-semibold">{demo ? t('demoSavedTitle') : t('bookingSavedTitle')}</h2><p className="ui-muted mt-3">{demo ? t('demoSavedBody') : t('bookingSavedBody')}</p></div>
    <dl className="rounded-2xl bg-stone-50 p-5 space-y-3 text-sm"><div><dt className="ui-muted">{t('mentor')}</dt><dd className="font-semibold mt-1">{saved.counselor_name}</dd></div><div><dt className="ui-muted">{t('session')}</dt><dd className="font-semibold mt-1">{saved.slot}</dd></div><div><dt className="ui-muted">{t('bookingReference')}</dt><dd className="font-mono text-xs break-all mt-1 select-all">{saved.id}</dd></div></dl>
    {warning && <p className="ui-alert" role="status">{warning}</p>}
    {!demo && saved.payment_status !== 'confirmed' && <BookingReceiptForm booking={saved} onSaved={setSaved} />}
    <Link href="/my-bookings" className="ui-button w-full">{t('openBookings')}<ArrowRight size={18} aria-hidden /></Link>
    <p className="text-sm ui-muted">{t('browserIdentity')}</p>
  </section>;

  return <section className="ui-panel p-6 sm:p-8" aria-labelledby="booking-heading">
    <p className="ui-eyebrow">{t('yourNextStep')}</p><h2 id="booking-heading" className="font-serif text-3xl mt-2">{t('bookSession')}</h2>
    {demo && <p className="ui-alert mt-4">{t('demoBookingNotice')}</p>}
    <ol className="flex gap-2 my-7" aria-label={t('bookingSteps')}>{['choose', 'details', 'review'].map((label, i) => <li key={label} className="flex-1" aria-current={step === i + 1 ? 'step' : undefined}><span className={`h-1.5 rounded-full block mb-2 ${step >= i + 1 ? 'bg-amber-800' : 'bg-stone-200'}`} /><span className={`text-xs sm:text-sm ${step === i + 1 ? 'font-bold' : 'ui-muted'}`}>{i + 1}. {t(label)}</span></li>)}</ol>
    <form onSubmit={(e) => { e.preventDefault(); setError(''); if (step < 3) setStep(step + 1); else void submit(); }}>
      {step === 1 && <div className="space-y-6">
        <fieldset><legend className="ui-label mb-3">{t('choosePackage')}</legend><div className="grid sm:grid-cols-2 gap-3">{(['standard', 'premium'] as const).map((value) => <label key={value} className={`p-4 rounded-2xl border cursor-pointer ${tier === value ? 'border-amber-800 bg-amber-50 ring-1 ring-amber-800' : 'border-stone-200'}`}><div className="flex gap-2 items-center"><input type="radio" name="tier" value={value} checked={tier === value} onChange={() => setTier(value)} className="accent-amber-900" /><span className="font-semibold">{t(value)}</span></div><p className="font-serif text-2xl mt-3">{formatInteger(value === 'standard' ? counselor.standardPrice : counselor.premiumPrice, locale)} <span className="text-sm font-sans">UZS</span></p><p className="text-sm ui-muted mt-2">{t(value === 'standard' ? 'standardHelp' : 'premiumHelp')}</p></label>)}</div></fieldset>
        <fieldset><legend className="ui-label mb-3">{t('chooseTime')}</legend>{counselor.availableSlots.length ? <div className="space-y-2">{counselor.availableSlots.map((value) => <label key={value} className={`flex items-center gap-3 border rounded-xl p-3.5 cursor-pointer ${slot === value ? 'border-amber-800 bg-amber-50' : 'border-stone-200'}`}><input type="radio" required name="slot" value={value} checked={slot === value} onChange={() => setSlot(value)} className="accent-amber-900" /><Clock size={17} aria-hidden /><span className="text-sm">{value}</span></label>)}</div> : <p className="ui-alert">{t('noSlots')}</p>}<p className="ui-muted text-sm mt-3">{t('slotHelp')}</p></fieldset>
      </div>}
      {step === 2 && <div className="space-y-4">
        <div><label htmlFor="booking-name" className="ui-label">{t('fullName')}</label><input id="booking-name" autoComplete="name" className="ui-input" required minLength={3} maxLength={120} value={form.studentName} onChange={(e) => field('studentName', e.target.value)} /></div>
        <div><label htmlFor="booking-email" className="ui-label">{t('email')}</label><input id="booking-email" type="email" autoComplete="email" className="ui-input" required maxLength={254} value={form.email} onChange={(e) => field('email', e.target.value)} /><p className="ui-muted text-sm mt-2">{t('emailHelp')}</p></div>
        <div className="grid sm:grid-cols-2 gap-4"><div><label htmlFor="booking-phone" className="ui-label">{t('phoneOptional')}</label><input id="booking-phone" type="tel" autoComplete="tel" className="ui-input" maxLength={30} value={form.phone} onChange={(e) => field('phone', e.target.value)} /></div><div><label htmlFor="booking-telegram" className="ui-label">{t('telegramOptional')}</label><input id="booking-telegram" className="ui-input" maxLength={100} value={form.telegram} onChange={(e) => field('telegram', e.target.value)} placeholder="@username" /></div></div>
        <div><label htmlFor="booking-education" className="ui-label">{t('educationOptional')}</label><input id="booking-education" className="ui-input" maxLength={250} value={form.education} onChange={(e) => field('education', e.target.value)} /></div>
        <div><label htmlFor="booking-question" className="ui-label">{t('goal')}</label><textarea id="booking-question" className="ui-input min-h-32" required minLength={5} maxLength={4000} value={form.question} onChange={(e) => field('question', e.target.value)} placeholder={t('goalPlaceholder')} /></div>
      </div>}
      {step === 3 && <div className="space-y-5">
        <div className="rounded-2xl bg-stone-50 p-5"><div className="flex gap-3 items-center"><Video size={22} aria-hidden /><div><p className="font-semibold">{t(tier)} · {counselor.fullName}</p><p className="ui-muted text-sm mt-1">{slot}</p></div></div><div className="border-t border-stone-200 mt-4 pt-4 flex justify-between"><span>{t('total')}</span><strong>{formatInteger(price, locale)} UZS</strong></div><p className="text-sm ui-muted mt-3">{form.studentName} · {form.email}</p></div>
        {!demo && <><PaymentInstructions onReady={setPaymentReady} showDetails={false} /><div><label htmlFor="booking-method" className="ui-label">{t('transferApp')}</label><select id="booking-method" className="ui-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}><option value="payme">Payme</option><option value="click">Click</option><option value="uzum">Uzum</option></select></div><div><label htmlFor="booking-receipt" className="ui-label">{t('receiptOptional')}</label><input id="booking-receipt" className="ui-input" maxLength={200} value={form.paymentReceipt} onChange={(e) => field('paymentReceipt', e.target.value)} /><p className="ui-muted text-sm mt-2">{t('receiptHelp')}</p></div></>}
        <p className="text-sm ui-muted">{demo ? t('demoSavedBody') : t('submitHelp')}</p>
      </div>}
      {error && <div className="ui-alert mt-5" role="alert">{error}</div>}
      <div className="flex gap-3 mt-7">{step > 1 && <button type="button" className="ui-button-secondary" disabled={submitting} onClick={() => { setStep(step - 1); setError(''); }}><ArrowLeft size={16} aria-hidden />{t('back')}</button>}<button className="ui-button flex-1" disabled={submitting || (step === 1 && counselor.availableSlots.length === 0) || (step === 3 && !demo && !paymentReady)}>{submitting ? <Loader2 size={18} className="animate-spin" aria-hidden /> : step === 3 ? <Check size={18} aria-hidden /> : null}{submitting ? t('saving') : step < 3 ? t('continue') : demo ? t('saveDemo') : t('submitBooking')}{step < 3 && <ArrowRight size={18} aria-hidden />}</button></div>
    </form>
  </section>;
}
