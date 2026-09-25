'use client';

import { formatInteger } from '@/lib/format';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowRight, CalendarDays, CheckCircle2, Clock, Loader2, MessageCircle, RefreshCw, Star, Video } from 'lucide-react';
import Navbar from '@/components/Navbar';
import CounselorAvatar from '@/components/CounselorAvatar';
import Footer from '@/components/Footer';
import BookingReceiptForm from '@/components/BookingReceiptForm';
import { readDemoBookings, studentAccessToken, StudentBooking } from '@/components/studentJourney';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type ThreadSummary = { booking_id: string; payment_status: string; total_owed: number; questions_used: number };
type Filter = 'all' | 'pending' | 'confirmed' | 'completed' | 'text';

function ReviewForm({ booking, onSaved }: { booking: StudentBooking; onSaved: () => void }) {
  const t = useTranslations('journeys');
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <form className="space-y-4 mt-4" onSubmit={async (e) => {
    e.preventDefault(); if (busy) return; setBusy(true); setError(false);
    try {
      const token = await studentAccessToken();
      const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ bookingId: booking.id, rating, text: text.trim() }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error('review_failed');
      onSaved();
    } catch { setError(true); } finally { setBusy(false); }
  }}><fieldset><legend className="ui-label">{t('yourRating')}</legend><div className="flex flex-wrap gap-2 mt-2">{[1,2,3,4,5].map((n) => <label key={n} className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg cursor-pointer ${rating === n ? 'border-amber-800 bg-amber-50' : 'border-stone-200'}`}><input type="radio" name={`rating-${booking.id}`} required value={n} checked={rating === n} onChange={() => setRating(n)} className="accent-amber-900" /><Star size={16} aria-hidden />{n}</label>)}</div></fieldset><div><label htmlFor={`review-${booking.id}`} className="ui-label">{t('yourReview')}</label><textarea id={`review-${booking.id}`} className="ui-input min-h-24" required minLength={10} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} /></div>{error && <p className="ui-alert" role="alert">{t('reviewFailed')}</p>}<button className="ui-button" disabled={busy}>{busy && <Loader2 size={17} className="animate-spin" aria-hidden />}{t('publishReview')}</button></form>;
}

export default function MyBookingsPage() {
  const t = useTranslations('journeys');
  const locale = useLocale();
  const demo = !isSupabaseConfigured();
  const [bookings, setBookings] = useState<StudentBooking[]>([]);
  const [threads, setThreads] = useState<Record<string, ThreadSummary>>({});
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState(false);
  const [partialError, setPartialError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => { if (!controller.signal.aborted) setSlow(true); }, 5000);
    async function load() {
      setLoading(true); setError(false); setSlow(false); setPartialError(false);
      try {
        if (demo) { setBookings(readDemoBookings()); return; }
        const { data: session, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;
        if (!session.session) { setBookings([]); return; }
        const { data, error: fetchError } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).abortSignal(controller.signal);
        if (fetchError) throw fetchError;
        if (controller.signal.aborted) return;
        const rows = (data || []) as StudentBooking[];
        setBookings(rows);
        const textIds = rows.filter((b) => b.tier === 'text_qa').map((b) => b.id);
        const completedIds = rows.filter((b) => b.status === 'completed').map((b) => b.id);
        const [threadResult, reviewResult] = await Promise.all([
          textIds.length ? supabase.from('question_threads').select('booking_id,payment_status,total_owed,questions_used').in('booking_id', textIds).abortSignal(controller.signal) : Promise.resolve({ data: [], error: null }),
          completedIds.length ? supabase.from('reviews').select('booking_id').in('booking_id', completedIds).abortSignal(controller.signal) : Promise.resolve({ data: [], error: null }),
        ]);
        if (controller.signal.aborted) return;
        setThreads(Object.fromEntries((threadResult.data || []).map((r) => [r.booking_id, r])));
        setReviewed(new Set((reviewResult.data || []).map((r) => r.booking_id)));
        setPartialError(Boolean(threadResult.error || reviewResult.error));
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { clearTimeout(timer); if (!controller.signal.aborted) { setLoading(false); setSlow(false); } }
    }
    void load();
    return () => { clearTimeout(timer); controller.abort(); };
  }, [attempt, demo]);

  const visible = bookings.filter((b) => filter === 'all' || (filter === 'text' ? b.tier === 'text_qa' : filter === 'completed' ? b.status === 'completed' : b.tier !== 'text_qa' && b.status !== 'completed' && b.payment_status === filter));
  return <div className="ui-page"><Navbar /><main className="ui-container py-10 sm:py-14">
    <div className="flex items-start justify-between gap-5 flex-wrap"><div><p className="ui-eyebrow">{t('yourJourney')}</p><h1 className="font-serif text-4xl sm:text-5xl mt-3">{t('myBookings')}</h1><p className="ui-muted mt-4 max-w-xl leading-relaxed">{t('bookingsIntro')}</p></div><button className="ui-button-secondary" disabled={loading} onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={17} className={loading ? 'animate-spin' : ''} aria-hidden />{t('refresh')}</button></div>
    <p className="text-sm ui-muted mt-4">{demo ? t('demoHistoryNotice') : t('browserIdentity')}</p>
    <div className="flex gap-2 overflow-x-auto py-2 mt-8 mb-6" aria-label={t('filterBookings')}>{(['all','pending','confirmed','completed','text'] as const).map((value) => <button key={value} className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold border ${filter === value ? 'bg-amber-900 border-amber-900 text-white' : 'border-stone-200 bg-white text-stone-600'}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{t(`filter_${value}`)}</button>)}</div>
    {loading ? <div className="ui-panel py-16 px-6 text-center" role="status"><Loader2 className="animate-spin mx-auto text-amber-800" size={28} aria-hidden /><p className="mt-4 ui-muted">{slow ? t('bookingsSlow') : t('loadingBookings')}</p></div>
      : error ? <div className="ui-panel p-8 text-center" role="alert"><h2 className="font-serif text-2xl">{t('bookingsLoadFailed')}</h2><p className="ui-muted mt-3">{t('bookingsLoadFailedHelp')}</p><button className="ui-button mt-6" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={17} aria-hidden />{t('retry')}</button></div>
      : <>{partialError && <p className="ui-alert mb-5" role="status">{t('partialLoadFailed')}</p>}{visible.length === 0 ? <div className="ui-panel p-10 sm:p-16 text-center"><div className="h-16 w-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto"><CalendarDays className="text-amber-800" size={28} aria-hidden /></div><h2 className="font-serif text-2xl mt-6">{t(bookings.length ? 'emptyFilter' : 'emptyBookings')}</h2><p className="ui-muted mt-3 max-w-md mx-auto">{t(bookings.length ? 'emptyFilterHelp' : 'emptyBookingsHelp')}</p>{bookings.length ? <button className="ui-button-secondary mt-6" onClick={() => setFilter('all')}>{t('showAll')}</button> : <Link className="ui-button mt-6" href="/">{t('browseMentors')}<ArrowRight size={17} aria-hidden /></Link>}</div> : <div className="grid gap-5 lg:grid-cols-2 items-start">{visible.map((b) => {
        const textThread = threads[b.id];
        const textBooking = b.tier === 'text_qa';
        const completed = b.status === 'completed';
        const paid = b.payment_status === 'confirmed';
        const statusLabel = textBooking ? textThread?.payment_status === 'closed' ? 'threadClosed' : textThread?.payment_status === 'awaiting_payment' ? 'awaitingPayment' : 'threadActive' : completed ? 'completed' : paid ? 'paymentConfirmed' : b.payment_status === 'rejected' ? 'paymentRejected' : 'awaitingPayment';
        const validMeeting = b.meet_link?.startsWith('https://meet.jit.si/');
        return <article key={b.id} className="ui-panel p-5 sm:p-7 space-y-5"><div className="flex justify-between items-start gap-3"><div className="flex items-start gap-3">{b.counselor_avatar ? <CounselorAvatar src={b.counselor_avatar} name={b.counselor_name} className="h-14 w-14 rounded-2xl bg-stone-100" /> : <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center">{textBooking ? <MessageCircle aria-hidden /> : <Video aria-hidden />}</div>}<div><Link href={`/counselors/${encodeURIComponent(b.counselor_id)}`} className="font-semibold text-lg hover:underline">{b.counselor_name}</Link><p className="ui-muted text-sm mt-1">{t(textBooking ? 'textConsultation' : b.tier)}</p></div></div><span className="ui-status">{b.demo ? t('demoBadge') : t(statusLabel)}</span></div>
          <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-stone-50 p-4 text-sm"><div className="col-span-2"><dt className="ui-muted flex items-center gap-1.5"><Clock size={14} aria-hidden />{t(textBooking ? 'conversationStarted' : 'session')}</dt><dd className="font-semibold mt-2">{textBooking ? new Date(b.created_at).toLocaleDateString(locale) : b.slot}</dd></div><div><dt className="ui-muted">{t(textBooking ? 'balanceLabel' : 'total')}</dt><dd className="font-semibold mt-1">{textBooking && !textThread ? '—' : formatInteger(textBooking ? textThread?.total_owed || 0 : b.price, locale)} UZS</dd></div><div><dt className="ui-muted">{t('bookingReference')}</dt><dd className="font-mono text-xs mt-1 break-all select-all">{b.id}</dd></div></dl>
          {b.demo ? <p className="ui-alert text-sm">{t('demoSavedBody')}</p> : textBooking ? <Link className="ui-button w-full" href={`/counselors/${encodeURIComponent(b.counselor_id)}?mode=text&booking=${encodeURIComponent(b.id)}`}><MessageCircle size={17} aria-hidden />{t(textThread?.payment_status === 'closed' ? 'readTranscript' : 'openConversation')}<ArrowRight size={17} aria-hidden /></Link> : <>
            {paid && !completed ? validMeeting ? <a href={b.meet_link!} className="ui-button w-full" target="_blank" rel="noopener noreferrer"><Video size={18} aria-hidden />{t('joinMeeting')}</a> : <p className="ui-alert">{t('meetingNotReady')}</p> : !completed && <><p className="text-sm ui-muted">{t('pendingBookingHelp')}</p><button className="ui-button-secondary w-full" onClick={() => setPaymentOpen(paymentOpen === b.id ? null : b.id)} aria-expanded={paymentOpen === b.id}>{t(b.payment_receipt ? 'paymentDetails' : 'addTransferReference')}</button>{paymentOpen === b.id && <BookingReceiptForm booking={b} onSaved={(updated) => setBookings((rows) => rows.map((row) => row.id === updated.id ? updated : row))} />}</>}
            {completed && (reviewed.has(b.id) ? <p className="flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 size={17} aria-hidden />{t('reviewThanks')}</p> : <><button className="ui-button-secondary w-full" onClick={() => setReviewing(reviewing === b.id ? null : b.id)} aria-expanded={reviewing === b.id}><Star size={17} aria-hidden />{t('leaveReview')}</button>{reviewing === b.id && <ReviewForm booking={b} onSaved={() => { setReviewed((ids) => new Set(ids).add(b.id)); setReviewing(null); }} />}</>)}
          </>}
        </article>;
      })}</div>}</>}
  </main><Footer /></div>;
}
