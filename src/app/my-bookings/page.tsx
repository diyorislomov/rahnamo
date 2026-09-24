'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getDeviceId } from '@/lib/deviceId';
import { supabase } from '@/lib/supabase';
import { Calendar, ArrowLeft, CheckCircle, ExternalLink, ShieldCheck, Clock, Sparkles, Filter, Star, MessageSquareText, Lock } from 'lucide-react';

interface SavedBooking {
  id: string;
  counselorId?: string;
  counselor_id?: string;
  counselorName?: string;
  counselor_name?: string;
  counselorHeadline?: string;
  counselor_headline?: string;
  counselorAvatar?: string;
  counselor_avatar?: string;
  tier: string;
  price: number;
  paymentMethod?: string;
  payment_method?: string;
  slot: string;
  studentName?: string;
  student_name?: string;
  email?: string;
  telegram: string;
  createdAt?: string;
  created_at?: string;
  meetLink?: string;
  meet_link?: string;
  status?: string;
  paymentStatus?: string;
  payment_status?: string;
}

type TabFilter = 'all' | 'upcoming' | 'completed';

export default function MyBookingsPage() {
  const t = useTranslations('myBookings');
  const tCommon = useTranslations('common');
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<{ [bookingId: string]: { rating: number; text: string } }>({});
  const [reviewSubmitting, setReviewSubmitting] = useState<string | null>(null);
  const [reviewErrors, setReviewErrors] = useState<{ [bookingId: string]: string }>({});

  useEffect(() => {
    async function loadBookings() {
      let localBookings: SavedBooking[] = [];
      try {
        const item = localStorage.getItem('rahnamo_bookings');
        if (item) {
          localBookings = JSON.parse(item);
        }
      } catch (err) {
        console.error('LocalStorage parse error:', err);
      }

      const deviceId = getDeviceId();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Supabase fetch timeout')), 1500)
          );

          const fetchPromise = supabase
            .from('bookings')
            .select('*')
            .eq('device_id', deviceId)
            .order('created_at', { ascending: false });

          const res: any = await Promise.race([fetchPromise, timeoutPromise]);

          if (res?.data && res.data.length > 0) {
            // Local goes in FIRST so it only ever fills gaps (a booking made
            // while Supabase was unreachable) -- Supabase's row must win for
            // any id both sources have, or a stale local copy permanently
            // overwrites a real status change made from another device
            // (e.g. admin confirming payment), no matter how many times the
            // page is refreshed. That was a real, reproduced bug: this
            // device's own cached copy stayed 'pending' forever while the
            // database had already moved to 'confirmed'.
            const mergedMap = new Map<string, SavedBooking>();
            localBookings.forEach((b: SavedBooking) => mergedMap.set(b.id, b));
            res.data.forEach((b: SavedBooking) => mergedMap.set(b.id, b));

            const combined = Array.from(mergedMap.values()).sort((a, b) => {
              const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
              const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
              return timeB - timeA;
            });
            setBookings(combined);
            setLoading(false);
            loadReviewedIds(combined);
            return;
          }
        } catch (err) {
          console.warn('Supabase bookings fetch error or timeout, fallback to local:', err);
        }
      }

      setBookings(localBookings);
      setLoading(false);
      loadReviewedIds(localBookings);
    }

    function loadReviewedIds(list: SavedBooking[]) {
      const completedIds = list.filter((b) => b.status === 'completed').map((b) => b.id);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (completedIds.length === 0 || !supabaseUrl || supabaseUrl.includes('placeholder')) return;

      Promise.resolve(supabase.from('reviews').select('booking_id').in('booking_id', completedIds))
        .then(({ data }: { data: { booking_id: string }[] | null }) => {
          if (data) setReviewedBookingIds(new Set(data.map((r) => r.booking_id)));
        })
        .catch((err: unknown) => console.warn('Reviews fetch error:', err));
    }

    loadBookings();
  }, []);

  const handleSubmitReview = (b: SavedBooking) => {
    const draft = reviewDrafts[b.id] || { rating: 0, text: '' };
    if (draft.rating < 1 || draft.rating > 5) {
      setReviewErrors((prev) => ({ ...prev, [b.id]: t('review.ratingError') }));
      return;
    }
    if (!draft.text.trim() || draft.text.trim().length < 10) {
      setReviewErrors((prev) => ({ ...prev, [b.id]: t('review.textError') }));
      return;
    }

    const counselorId = b.counselorId || b.counselor_id;
    if (!counselorId) {
      setReviewErrors((prev) => ({ ...prev, [b.id]: t('review.counselorMissingError') }));
      return;
    }

    setReviewSubmitting(b.id);
    setReviewErrors((prev) => ({ ...prev, [b.id]: '' }));

    const studentFirstName = (b.studentName || b.student_name || t('review.defaultStudentName')).trim().split(' ')[0];

    Promise.resolve(
      supabase.from('reviews').insert({
        booking_id: b.id,
        counselor_id: counselorId,
        student_first_name: studentFirstName,
        rating: draft.rating,
        review_text: draft.text.trim(),
      })
    )
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) {
          setReviewErrors((prev) => ({ ...prev, [b.id]: t('review.saveError') }));
          return;
        }
        setReviewedBookingIds((prev) => new Set(prev).add(b.id));
        setReviewingId(null);
      })
      .catch(() => {
        setReviewErrors((prev) => ({ ...prev, [b.id]: t('review.saveError') }));
      })
      .finally(() => setReviewSubmitting(null));
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'upcoming') return b.status !== 'completed';
    if (activeTab === 'completed') return b.status === 'completed';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200 flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-300/60 shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" /> {t('backToCatalog')}
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/10 text-amber-900 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>{t('headerBadge')}</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-amber-950">
                {t('heading')}
              </h1>
            </div>

            {/* Filter Tabs (MentorCruise Style) */}
            <div className="flex items-center bg-amber-100/70 p-1 rounded-2xl border border-amber-900/15 text-xs font-bold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-amber-900 text-amber-50 shadow-xs'
                    : 'text-stone-700 hover:text-amber-950'
                }`}
              >
                {t('tabs.all', { count: bookings.length })}
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'upcoming'
                    ? 'bg-amber-900 text-amber-50 shadow-xs'
                    : 'text-stone-700 hover:text-amber-950'
                }`}
              >
                {t('tabs.upcoming')}
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'completed'
                    ? 'bg-amber-900 text-amber-50 shadow-xs'
                    : 'text-stone-700 hover:text-amber-950'
                }`}
              >
                {t('tabs.completed')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs text-stone-500 font-serif">
              {t('loading')}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 my-6 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-amber-800" />
              </div>
              <h3 className="font-serif font-bold text-xl text-amber-950">
                {t('emptyTitle')}
              </h3>
              <p className="text-xs text-stone-500 mt-2 max-w-sm mx-auto">
                {t('emptyBody')}
              </p>
              <Link
                href="/"
                className="mt-6 inline-block bg-gradient-to-r from-amber-800 to-amber-900 text-amber-50 font-bold text-xs px-6 py-3 rounded-xl shadow-xs hover:from-amber-700 hover:to-amber-800 transition-all"
              >
                {tCommon('viewCounselors')}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => {
                const name = b.counselorName || b.counselor_name || 'Rahnamo';
                const headline = b.counselorHeadline || b.counselor_headline || '';
                const avatar = b.counselorAvatar || b.counselor_avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400';
                const meetUrl = b.meetLink || b.meet_link || 'https://meet.jit.si';
                const paymentMethod = b.paymentMethod || b.payment_method;
                const paymentStatus = b.paymentStatus || b.payment_status || 'pending';
                const isPaymentConfirmed = paymentStatus === 'confirmed';
                const isCompleted = b.status === 'completed';
                const alreadyReviewed = reviewedBookingIds.has(b.id);
                const isReviewing = reviewingId === b.id;
                const draft = reviewDrafts[b.id] || { rating: 0, text: '' };

                // "Matnli maslahat" bookings are just a history entry --
                // the live thread (running total, messages, payment) lives
                // on the counselor's own profile page via TextQaPanel, not
                // duplicated here.
                if (b.tier === 'text_qa') {
                  return (
                    <div
                      key={b.id}
                      className="bg-white/95 rounded-3xl p-6 border border-amber-900/15 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={avatar}
                          alt={name}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-200 shadow-xs"
                        />
                        <div>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-md uppercase font-mono">
                            {b.id}
                          </span>
                          <h3 className="font-serif font-bold text-base text-amber-950 mt-1">{name}</h3>
                          <p className="text-xs text-stone-500">{t('textQaLabel')}</p>
                        </div>
                      </div>
                      {b.counselorId || b.counselor_id ? (
                        <Link
                          href={`/counselors/${b.counselorId || b.counselor_id}`}
                          className="flex-shrink-0 inline-flex items-center gap-1.5 bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
                        >
                          {t('goToThread')}
                        </Link>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div
                    key={b.id}
                    className="bg-white/95 rounded-3xl p-6 border border-amber-900/15 shadow-sm hover:shadow-md transition-all"
                  >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={avatar}
                        alt={name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-200 shadow-xs"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-md uppercase font-mono">
                            {b.id}
                          </span>
                          {isPaymentConfirmed ? (
                            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> {t('paymentConfirmed')}
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 animate-spin" /> {t('paymentPending')}
                            </span>
                          )}
                        </div>
                        <h3 className="font-serif font-bold text-lg text-amber-950 mt-1">{name}</h3>
                        <p className="text-xs text-stone-500">{headline}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-medium text-amber-950">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-800" /> {b.slot}
                          </span>
                          <span>•</span>
                          <span className="capitalize font-bold text-amber-900">
                            {b.tier === 'standard' || b.tier === 'premium' ? tCommon(b.tier) : b.tier} ({b.price.toLocaleString()} UZS {paymentMethod ? `via ${paymentMethod.toUpperCase()}` : ''})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t md:border-t-0 md:border-l border-amber-900/10 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center min-w-[180px]">
                      <span className="text-[11px] text-stone-500">{t('contactLabel', { telegram: b.telegram })}</span>
                      {isPaymentConfirmed ? (
                        <a
                          href={meetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
                        >
                          {t('joinVideoRoom')} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <div className="mt-2 flex items-center gap-1.5 bg-stone-100 text-stone-500 text-[11px] font-semibold px-3 py-2.5 rounded-xl text-center">
                          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{t('videoLocked')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isCompleted && !alreadyReviewed && (
                    <div className="mt-4 pt-4 border-t border-amber-900/10">
                      {isReviewing ? (
                        <div className="space-y-2.5 max-w-md">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() =>
                                  setReviewDrafts((prev) => ({ ...prev, [b.id]: { ...draft, rating: n } }))
                                }
                                className="cursor-pointer"
                              >
                                <Star
                                  className={`w-5 h-5 ${n <= draft.rating ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`}
                                />
                              </button>
                            ))}
                          </div>
                          <textarea
                            rows={3}
                            value={draft.text}
                            onChange={(e) =>
                              setReviewDrafts((prev) => ({ ...prev, [b.id]: { ...draft, text: e.target.value } }))
                            }
                            placeholder={t('review.placeholder')}
                            className="w-full p-2.5 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                          />
                          {reviewErrors[b.id] && (
                            <p className="text-[11px] text-red-600">{reviewErrors[b.id]}</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={reviewSubmitting === b.id}
                              onClick={() => handleSubmitReview(b)}
                              className="px-3.5 py-2 rounded-xl bg-amber-900 text-amber-50 text-xs font-bold hover:bg-amber-800 transition-colors cursor-pointer disabled:opacity-60"
                            >
                              {reviewSubmitting === b.id ? t('review.submitting') : t('review.submit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setReviewingId(null)}
                              className="px-3.5 py-2 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold hover:bg-stone-200 transition-colors cursor-pointer"
                            >
                              {t('review.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReviewingId(b.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
                        >
                          <MessageSquareText className="w-3.5 h-3.5" />
                          {t('review.leaveReview')}
                        </button>
                      )}
                    </div>
                  )}

                  {isCompleted && alreadyReviewed && (
                    <div className="mt-4 pt-4 border-t border-amber-900/10">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle className="w-3.5 h-3.5" /> {t('review.thankYou')}
                      </span>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}