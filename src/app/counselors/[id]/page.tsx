'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, MessageCircle, RefreshCw, Star, Video } from 'lucide-react';
import { Counselor, Review } from '@/types';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
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
      setLoading(true); setError(false); setReviews([]); setReviewError(false);
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
  return <div className="ui-page"><Navbar /><main className="ui-container py-8 sm:py-12">
    <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900 mb-8"><ArrowLeft size={16} aria-hidden />{t('backToMentors')}</Link>
    {loading ? <div className="grid lg:grid-cols-2 gap-8 animate-pulse" role="status" aria-label={t('loadingProfile')}><div className="ui-panel p-8 space-y-5"><div className="h-24 w-24 bg-stone-200 rounded-3xl"/><div className="h-8 w-3/4 bg-stone-200 rounded"/><div className="h-40 bg-stone-100 rounded"/></div><div className="ui-panel h-96" /></div>
      : error ? <div className="ui-panel p-8 text-center"><h1 className="text-2xl font-serif">{t('profileLoadError')}</h1><button className="ui-button mt-5" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={17} aria-hidden />{t('retry')}</button></div>
      : !counselor ? <div className="ui-panel p-10 text-center"><h1 className="text-3xl font-serif">{t('mentorNotFound')}</h1><p className="ui-muted mt-3">{t('mentorNotFoundBody')}</p><Link href="/" className="ui-button mt-6">{t('browseMentors')}</Link></div>
      : <div className="grid lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.05fr_1fr] gap-7 lg:gap-10 items-start">
        <div className="space-y-7">
          <section className="ui-panel overflow-hidden"><div className="h-24 sm:h-32 bg-gradient-to-br from-amber-100 via-amber-50 to-stone-100"/><div className="px-6 pb-7 sm:px-8 sm:pb-8"><div className="relative -mt-12 mb-5 flex items-end justify-between gap-3"><CounselorAvatar src={counselor.avatarUrl} name={counselor.fullName} priority className="h-28 w-28 rounded-3xl border-4 border-white bg-stone-100 shadow-sm" />{demo && <span className="ui-status">{t('demoBadge')}</span>}</div><p className="ui-eyebrow">{counselor.company || t('mentorProfile')}</p><h1 className="text-3xl sm:text-4xl font-serif mt-2 leading-tight">{counselor.fullName}</h1><p className="text-base sm:text-lg ui-muted mt-3 leading-relaxed">{counselor.headline}</p><div className="flex flex-wrap gap-2 mt-5">{counselor.specialties.map((s) => <span key={s} className="px-3 py-1.5 text-xs sm:text-sm bg-amber-50 border border-amber-200/70 rounded-full text-amber-900">{s}</span>)}</div></div></section>
          <section className="ui-panel p-6 sm:p-8"><h2 className="font-serif text-2xl">{t('aboutMentor')}</h2><p className="ui-muted leading-7 mt-4 whitespace-pre-line">{counselor.bio}</p>{counselor.whyWorkWithMe && <><h3 className="font-semibold text-lg mt-7">{t('howIHelp')}</h3><p className="ui-muted mt-3 leading-7 whitespace-pre-line">{counselor.whyWorkWithMe}</p></>}</section>
          <section className="ui-panel p-6 sm:p-8"><div className="flex justify-between gap-3 items-center"><h2 className="font-serif text-2xl">{t('studentReviews')}</h2>{reviews.length > 0 && <span className="inline-flex items-center gap-1 font-semibold"><Star size={17} className="fill-amber-500 text-amber-500" aria-hidden />{(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}</span>}</div>{reviewError ? <p className="ui-alert mt-4">{t('reviewsLoadError')}</p> : reviews.length === 0 ? <p className="ui-muted mt-4">{t('noReviews')}</p> : <div className="divide-y divide-stone-200 mt-3">{reviews.map((r) => <article key={r.id} className="py-5"><div className="flex justify-between text-sm"><strong>{r.studentFirstName}</strong><span aria-label={t('ratingLabel', { rating: r.rating })} className="text-amber-800">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span></div><p className="ui-muted mt-3 leading-relaxed whitespace-pre-line">{r.reviewText}</p></article>)}</div>}</section>
          {!demo && <details className="ui-panel p-6"><summary className="font-semibold cursor-pointer flex items-center justify-between">{t('mentorWorkspace')}<ArrowUpRight size={17} aria-hidden /></summary><div className="mt-5"><MentorInboxPanel counselor={counselor} /></div></details>}
        </div>
        <div className="space-y-4 lg:sticky lg:top-28">
          {(counselor.pricePerQuestion != null || bookingId) && <div className="ui-panel p-1.5 flex gap-1" role="group" aria-label={t('consultationType')}><button id="video-tab" aria-controls="consultation-panel" aria-pressed={mode === 'video'} onClick={() => selectMode('video')} className={`flex-1 rounded-xl py-3 px-3 flex items-center justify-center gap-2 text-sm font-semibold ${mode === 'video' ? 'bg-amber-900 text-white' : 'text-stone-600'}`}><Video size={18} aria-hidden />{t('videoSession')}</button><button id="text-tab" aria-controls="consultation-panel" aria-pressed={mode === 'text'} onClick={() => selectMode('text')} className={`flex-1 rounded-xl py-3 px-3 flex items-center justify-center gap-2 text-sm font-semibold ${mode === 'text' ? 'bg-amber-900 text-white' : 'text-stone-600'}`}><MessageCircle size={18} aria-hidden />{t('textConsultation')}</button></div>}
          <div id="consultation-panel" role="region" aria-label={t(mode === 'text' ? 'textConsultation' : 'videoSession')}>{mode === 'text' && (counselor.pricePerQuestion != null || bookingId) ? <TextQaPanel key={`${rawId}-${bookingId || 'current'}`} counselor={counselor} bookingId={bookingId} /> : <StudentBookingFlow key={rawId} counselor={counselor} />}</div>
        </div>
      </div>}
  </main><Footer /></div>;
}
