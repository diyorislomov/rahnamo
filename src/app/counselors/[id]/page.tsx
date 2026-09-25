'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, MessageCircle, RefreshCw, Star, Video } from 'lucide-react';
import { Counselor, Review } from '@/types';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import { formatSpecialtyLabel, getCounselorContent } from '@/lib/counselor-content';
import { formatInteger } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured, mapCounselorRow } from '@/lib/counselors';
import Navbar from '@/components/Navbar';
import CounselorAvatar from '@/components/CounselorAvatar';
import Footer from '@/components/Footer';
import StudentBookingFlow from '@/components/StudentBookingFlow';
import TextQaPanel from '@/components/TextQaPanel';
import MentorInboxPanel from '@/components/MentorInboxPanel';

export default function CounselorPage() {
  const t = useTranslations('journeys');
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const demo = !isSupabaseConfigured();
  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewError, setReviewError] = useState(false);
  const [mode, setMode] = useState<'video' | 'text'>('video');
  const [bookingId, setBookingId] = useState<string | undefined>();
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);

  useEffect(() => {
    const sync = () => {
      const query = new URLSearchParams(window.location.search);
      setMode(query.get('mode') === 'text' ? 'text' : 'video');
      setBookingId(query.get('booking') || undefined);
    };
    Promise.resolve().then(sync);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [rawId]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(false); setReviews([]); setReviewError(false); setBookingComplete(false); setBookingStep(1);
      try {
        if (demo) { setCounselor(INITIAL_COUNSELORS.find((c) => c.id === rawId) || null); return; }
        const { data, error: loadError } = await supabase.from('counselors').select('*').eq('id', rawId).abortSignal(controller.signal).maybeSingle();
        if (loadError) throw loadError;
        if (controller.signal.aborted) return;
        setCounselor(data ? mapCounselorRow(data) : null);
        if (data) {
          const { data: rows, error: rError } = await supabase.from('reviews').select('id, booking_id, counselor_id, student_first_name, rating, review_text, created_at').eq('counselor_id', rawId).order('created_at', { ascending: false }).abortSignal(controller.signal);
          if (controller.signal.aborted) return;
          if (rError) setReviewError(true);
          else setReviews((rows || []).map((r) => ({ id: r.id, bookingId: r.booking_id, counselorId: r.counselor_id, studentFirstName: r.student_first_name, rating: r.rating, reviewText: r.review_text, createdAt: r.created_at })));
        }
      } catch { if (!controller.signal.aborted) { setError(true); setCounselor(null); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [rawId, demo, attempt]);

  const selectMode = (value: 'video' | 'text') => {
    setMode(value);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', value);
    window.history.replaceState(null, '', url);
  };
  const content = counselor ? getCounselorContent(counselor, locale, demo) : null;
  const bookablePrices = counselor ? [counselor.standardPrice, counselor.premiumPrice].filter((price) => Number.isSafeInteger(price) && price > 0) : [];
  const startingPrice = bookablePrices.length ? Math.min(...bookablePrices) : null;
  const openBooking = () => {
    selectMode('video');
    requestAnimationFrame(() => {
      const panel = document.getElementById('consultation-panel');
      panel?.scrollIntoView({ block: 'start' });
      panel?.focus({ preventScroll: true });
    });
  };

  return <div className="ui-page"><Navbar /><main className="ui-container py-5 sm:py-10">
    <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900 min-h-11 mb-3 sm:mb-5"><ArrowLeft size={16} aria-hidden />{t('backToMentors')}</Link>
    {loading ? <div className="grid lg:grid-cols-2 gap-8 animate-pulse" role="status" aria-label={t('loadingProfile')}><div className="ui-panel p-8 space-y-5"><div className="h-24 w-24 bg-stone-200 rounded-3xl"/><div className="h-8 w-3/4 bg-stone-200 rounded"/><div className="h-40 bg-stone-100 rounded"/></div><div className="ui-panel h-96" /></div>
      : error ? <div className="ui-panel p-8 text-center"><h1 className="text-2xl font-serif">{t('profileLoadError')}</h1><button className="ui-button mt-5" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={17} aria-hidden />{t('retry')}</button></div>
      : !counselor ? <div className="ui-panel p-10 text-center"><h1 className="text-3xl font-serif">{t('mentorNotFound')}</h1><p className="ui-muted mt-3">{t('mentorNotFoundBody')}</p><Link href="/" className="ui-button mt-6">{t('browseMentors')}</Link></div>
      : <div className="grid lg:grid-cols-2 gap-5 lg:gap-8 items-start">
        <section className="ui-panel p-5 sm:p-7 lg:col-start-1 lg:row-start-1">
          <div className="flex gap-4 items-start">
            <CounselorAvatar src={counselor.avatarUrl} name={counselor.fullName} priority className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-stone-100" />
            <div className="min-w-0 flex-1">
              {demo && <span className="ui-status mb-2">{t('demoBadge')}</span>}
              <h1 className="text-2xl sm:text-3xl font-serif leading-tight">{counselor.fullName}</h1>
              <p className="text-xs sm:text-sm ui-muted mt-2">{content?.company || t('mentorProfile')}</p>
            </div>
          </div>
          <p className="text-sm sm:text-base ui-muted mt-4 leading-relaxed">{content?.headline}</p>
          <div className="flex flex-wrap gap-2 mt-4">{counselor.specialties.map((specialty) => <span key={specialty} className="px-2.5 py-1 text-xs bg-amber-50 border border-amber-200/70 rounded-full text-amber-900">{formatSpecialtyLabel(specialty, locale)}</span>)}</div>
        </section>

        <div className="space-y-3 lg:col-start-2 lg:row-start-1 lg:row-span-4 lg:sticky lg:top-28">
          {(counselor.pricePerQuestion != null || bookingId) && <div className="ui-panel p-1.5 flex gap-1" role="group" aria-label={t('consultationType')}><button id="video-tab" aria-controls="consultation-panel" aria-pressed={mode === 'video'} onClick={() => selectMode('video')} className={`flex-1 rounded-xl min-h-12 py-3 px-3 flex items-center justify-center gap-2 text-sm font-semibold ${mode === 'video' ? 'bg-amber-900 text-white' : 'text-stone-600'}`}><Video size={18} aria-hidden />{t('videoSession')}</button><button id="text-tab" aria-controls="consultation-panel" aria-pressed={mode === 'text'} onClick={() => selectMode('text')} className={`flex-1 rounded-xl min-h-12 py-3 px-3 flex items-center justify-center gap-2 text-sm font-semibold ${mode === 'text' ? 'bg-amber-900 text-white' : 'text-stone-600'}`}><MessageCircle size={18} aria-hidden />{t('textConsultation')}</button></div>}
          <div id="consultation-panel" tabIndex={-1} role="region" aria-label={t(mode === 'text' ? 'textConsultation' : 'videoSession')} className="scroll-mt-24">{mode === 'text' && (counselor.pricePerQuestion != null || bookingId) ? <TextQaPanel key={`${rawId}-${bookingId || 'current'}`} counselor={counselor} bookingId={bookingId} /> : <StudentBookingFlow key={rawId} counselor={counselor} onSaved={setBookingComplete} onStepChange={setBookingStep} />}</div>
        </div>

        <details className="ui-panel p-5 sm:p-7 group lg:col-start-1">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">{t('aboutMentor')}<ChevronDown size={19} aria-hidden className="shrink-0 group-open:rotate-180" /></summary>
          <p className="ui-muted leading-7 mt-4 whitespace-pre-line">{content?.bio}</p>
          {content?.help && content.help !== content.bio && <><h2 className="font-semibold mt-5">{t('howIHelp')}</h2><p className="ui-muted mt-2 leading-7 whitespace-pre-line">{content.help}</p></>}
        </details>

        <details className="ui-panel p-5 sm:p-7 group lg:col-start-1">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden"><span>{t('studentReviews')}{reviews.length > 0 && <span className="ml-2 ui-muted">({reviews.length})</span>}</span><ChevronDown size={19} aria-hidden className="shrink-0 group-open:rotate-180" /></summary>
          {reviews.length > 0 && <p className="mt-3 inline-flex items-center gap-1 font-semibold"><Star size={17} className="fill-amber-500 text-amber-500" aria-hidden />{(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)}</p>}
          {reviewError ? <p className="ui-alert mt-4">{t('reviewsLoadError')}</p> : reviews.length === 0 ? <p className="ui-muted mt-3 text-sm">{t('noReviews')}</p> : <div className="divide-y divide-stone-200 mt-3">{reviews.map((review) => <article key={review.id} className="py-4"><div className="flex justify-between gap-3 text-sm"><strong>{review.studentFirstName}</strong><span aria-label={t('ratingLabel', { rating: review.rating })} className="shrink-0 text-amber-800">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div><p className="ui-muted mt-3 leading-relaxed whitespace-pre-line">{review.reviewText}</p></article>)}</div>}
        </details>
        {!demo && <details className="ui-panel p-5 sm:p-7 lg:col-start-1"><summary className="font-semibold min-h-11 cursor-pointer flex items-center justify-between">{t('mentorWorkspace')}<ArrowUpRight size={17} aria-hidden /></summary><div className="mt-5"><MentorInboxPanel counselor={counselor} /></div></details>}
      </div>}
  </main><Footer />
  {!loading && !error && counselor && mode === 'video' && bookingStep === 1 && !bookingComplete && startingPrice != null && counselor.availableSlots.length > 0 && <div className="ui-mobile-dock lg:hidden" aria-label={t('quickBooking')}><div className="ui-container flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs ui-muted">{t('startingPrice')}</p><p className="text-base font-bold whitespace-nowrap">{formatInteger(startingPrice, locale)} <span className="text-xs font-normal">{t('currency')}</span></p></div><button type="button" onClick={openBooking} className="ui-button shrink-0 px-4">{t('chooseTimeAction')}<ArrowRight size={17} aria-hidden /></button></div></div>}
  </div>;
}
