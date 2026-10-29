'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Calendar,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
  Star,
  MessageSquareText,
  Lock,
  LogIn,
  LogOut,
  Loader2,
  CalendarClock,
  XCircle,
  CreditCard,
} from 'lucide-react';
import { formatSlot } from '@/lib/slots';

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
  serviceTitle?: string;
  service_title?: string;
  durationMinutes?: number;
  duration_minutes?: number;
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
  const locale = useLocale();
  const { data: session, status: sessionStatus } = useSession();
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<{
    [bookingId: string]: { rating: number; text: string };
  }>({});
  const [reviewSubmitting, setReviewSubmitting] = useState<string | null>(null);
  const [reviewErrors, setReviewErrors] = useState<{ [bookingId: string]: string }>({});
  const [bookingActionId, setBookingActionId] = useState<string | null>(null);
  const [bookingActionErrors, setBookingActionErrors] = useState<{ [bookingId: string]: string }>(
    {}
  );
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [rescheduleSlot, setRescheduleSlot] = useState('');

  const menteeEmail: string | null | false =
    sessionStatus === 'loading'
      ? null
      : sessionStatus === 'authenticated' && session?.user
        ? session.user.email || session.user.name || 'mentee'
        : false;

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus !== 'authenticated' || !session?.user) return;
    fetch('/api/bookings')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'bookings_fetch_failed');
        setBookings((result.bookings || []) as SavedBooking[]);
        setReviewedBookingIds(new Set((result.reviewedBookingIds || []) as string[]));
      })
      .catch((error) => {
        console.warn('Bookings fetch error:', error);
        setBookings([]);
      })
      .finally(() => setLoading(false));
  }, [session, sessionStatus]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    localStorage.removeItem('rahnamo_bookings');
    setBookings([]);
  };

  const handleSubmitReview = (b: SavedBooking) => {
    const draft = reviewDrafts[b.id] || { rating: 0, text: '' };
    if (draft.rating < 1 || draft.rating > 5) {
      setReviewErrors((prev) => ({ ...prev, [b.id]: t('review.ratingError') }));
      return;
    }
    if (!draft.text.trim() || draft.text.trim().length < 10 || draft.text.trim().length > 2000) {
      setReviewErrors((prev) => ({ ...prev, [b.id]: t('review.textError') }));
      return;
    }

    if (!(b.counselorId || b.counselor_id)) {
      setReviewErrors((prev) => ({ ...prev, [b.id]: t('review.counselorMissingError') }));
      return;
    }

    setReviewSubmitting(b.id);
    setReviewErrors((prev) => ({ ...prev, [b.id]: '' }));

    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: b.id, rating: draft.rating, reviewText: draft.text.trim() }),
    })
      .then((response) => {
        if (!response.ok) {
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

  const handleCancelBooking = async (booking: SavedBooking) => {
    if (!window.confirm(t('manage.cancelConfirm'))) return;
    setBookingActionId(booking.id);
    setBookingActionErrors((current) => ({ ...current, [booking.id]: '' }));
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id: booking.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.booking) throw new Error(result.error || 'cancel_failed');
      setBookings((current) =>
        current.map((item) => (item.id === booking.id ? { ...item, status: 'cancelled' } : item))
      );
      setReschedulingId(null);
    } catch {
      setBookingActionErrors((current) => ({
        ...current,
        [booking.id]: t('manage.changeError'),
      }));
    } finally {
      setBookingActionId(null);
    }
  };

  const handleClickPayment = async (booking: SavedBooking) => {
    setBookingActionId(booking.id);
    setBookingActionErrors((current) => ({ ...current, [booking.id]: '' }));
    try {
      const response = await fetch('/api/payments/click/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const result = await response.json();
      if (
        !response.ok ||
        typeof result.paymentUrl !== 'string' ||
        !result.paymentUrl.startsWith('https://my.click.uz/')
      ) {
        throw new Error(result.error || 'click_checkout_failed');
      }
      window.location.assign(result.paymentUrl);
    } catch {
      setBookingActionId(null);
      setBookingActionErrors((current) => ({
        ...current,
        [booking.id]: t('manage.paymentError'),
      }));
    }
  };

  const openReschedule = async (booking: SavedBooking) => {
    const counselorId = booking.counselorId || booking.counselor_id;
    if (!counselorId) return;
    setBookingActionId(booking.id);
    setBookingActionErrors((current) => ({ ...current, [booking.id]: '' }));
    try {
      const response = await fetch(
        `/api/counselors/${encodeURIComponent(counselorId)}/availability`,
        { cache: 'no-store' }
      );
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.availableSlots))
        throw new Error('availability_failed');
      const slots = result.availableSlots.filter(
        (slot: unknown): slot is string => typeof slot === 'string' && slot !== booking.slot
      );
      setRescheduleSlots(slots);
      setRescheduleSlot(slots[0] || '');
      setReschedulingId(booking.id);
    } catch {
      setBookingActionErrors((current) => ({
        ...current,
        [booking.id]: t('manage.changeError'),
      }));
    } finally {
      setBookingActionId(null);
    }
  };

  const submitReschedule = async (booking: SavedBooking) => {
    if (!rescheduleSlot) return;
    setBookingActionId(booking.id);
    setBookingActionErrors((current) => ({ ...current, [booking.id]: '' }));
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reschedule', id: booking.id, slot: rescheduleSlot }),
      });
      const result = await response.json();
      if (!response.ok || !result.booking) throw new Error(result.error || 'reschedule_failed');
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id ? { ...item, slot: result.booking.slot } : item
        )
      );
      setReschedulingId(null);
    } catch {
      setBookingActionErrors((current) => ({
        ...current,
        [booking.id]: t('manage.changeError'),
      }));
    } finally {
      setBookingActionId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'upcoming') return b.status !== 'completed' && b.status !== 'cancelled';
    if (activeTab === 'completed') return b.status === 'completed';
    return true;
  });

  if (menteeEmail === null) {
    return <div className="min-h-screen bg-[#FBF9F5]" />;
  }

  if (menteeEmail === false) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] text-[#0F1E36] font-sans antialiased flex flex-col justify-between">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-16 w-full">
          <div className="surface-card p-8 text-center space-y-6">
            <div className="w-12 h-12 rounded-xl bg-[#0F1E36] text-white flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-[#0F1E36]">{t('heading')}</h1>
              <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">{t('signInPrompt')}</p>
            </div>
            <Link
              href="/login?redirect=/my-bookings"
              className="btn-primary-teal inline-flex items-center justify-center gap-2 w-full py-3.5 font-semibold text-xs sm:text-sm rounded-xl"
            >
              <LogIn className="w-4 h-4 text-[#F59E0B]" />
              <span>{t('signInLink')}</span>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#0F1E36] font-sans antialiased selection:bg-[#F59E0B]/25 flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              className="btn-secondary-surface inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#0F1E36]" />
              <span>{t('backToCatalog')}</span>
            </Link>

            <div className="flex items-center gap-2.5 text-xs">
              <span className="text-[#475569] font-medium hidden sm:inline">
                {t('signedInAs', { email: menteeEmail })}
              </span>
              <button
                onClick={handleSignOut}
                className="btn-secondary-surface inline-flex items-center gap-1.5 font-semibold px-3.5 py-2 rounded-xl cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[#475569]" />
                <span>{t('signOut')}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-5 border-b border-[#0F1E36]/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F1E36]/[0.08] text-[#0F1E36] text-[11px] font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                <span>{t('headerBadge')}</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F1E36]">
                {t('heading')}
              </h1>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-[#F3EFE6] p-1 rounded-xl border border-[#0F1E36]/10 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#0F1E36] text-white shadow-2xs'
                    : 'text-[#475569] hover:text-[#0F1E36]'
                }`}
              >
                {t('tabs.all', { count: bookings.length })}
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'upcoming'
                    ? 'bg-[#0F1E36] text-white shadow-2xs'
                    : 'text-[#475569] hover:text-[#0F1E36]'
                }`}
              >
                {t('tabs.upcoming')}
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'completed'
                    ? 'bg-[#0F1E36] text-white shadow-2xs'
                    : 'text-[#475569] hover:text-[#0F1E36]'
                }`}
              >
                {t('tabs.completed')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs text-zinc-500 font-medium">
              {t('loading')}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="surface-card p-12 text-center my-6">
              <div className="w-12 h-12 rounded-xl bg-[#F5EFE0] border border-zinc-900/10 text-[#0F4C5C] flex items-center justify-center mx-auto mb-3.5">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-xl text-zinc-900">{t('emptyTitle')}</h3>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                {t('emptyBody')}
              </p>
              <Link
                href="/"
                className="mt-6 inline-block btn-primary-teal font-semibold text-xs px-6 py-3 rounded-xl"
              >
                {tCommon('viewCounselors')}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => {
                const name = b.counselorName || b.counselor_name || 'Rahnamo';
                const headline = b.counselorHeadline || b.counselor_headline || '';
                const avatar =
                  b.counselorAvatar ||
                  b.counselor_avatar ||
                  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400';
                const meetUrl = b.meetLink || b.meet_link || 'https://meet.jit.si';
                const paymentMethod = b.paymentMethod || b.payment_method;
                const paymentStatus = b.paymentStatus || b.payment_status || 'pending';
                const serviceTitle = b.serviceTitle || b.service_title;
                const durationMinutes = b.durationMinutes || b.duration_minutes;
                const isPaymentConfirmed = paymentStatus === 'confirmed';
                const isCompleted = b.status === 'completed';
                const isCancelled = b.status === 'cancelled';
                const alreadyReviewed = reviewedBookingIds.has(b.id);
                const isReviewing = reviewingId === b.id;
                const draft = reviewDrafts[b.id] || { rating: 0, text: '' };

                if (b.tier === 'text_qa') {
                  return (
                    <div
                      key={b.id}
                      className="surface-card p-5 sm:p-6 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <Image
                          src={avatar}
                          alt={name}
                          width={56}
                          height={56}
                          className="w-14 h-14 rounded-xl object-cover border border-zinc-900/10"
                        />
                        <div>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 bg-[#F5EFE0] text-[#0F4C5C] rounded-md uppercase font-mono">
                            {b.id}
                          </span>
                          <h3 className="font-semibold text-base text-zinc-900 mt-1">{name}</h3>
                          <p className="text-xs text-zinc-500">{t('textQaLabel')}</p>
                        </div>
                      </div>
                      {b.counselorId || b.counselor_id ? (
                        <Link
                          href={`/counselors/${b.counselorId || b.counselor_id}`}
                          className="btn-primary-teal shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl"
                        >
                          {t('goToThread')}
                        </Link>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div key={b.id} className="surface-card p-5 sm:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start sm:items-center gap-4">
                        <Image
                          src={avatar}
                          alt={name}
                          width={64}
                          height={64}
                          className="w-15 h-15 rounded-xl object-cover border border-zinc-900/10 shrink-0"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#F5EFE0] text-zinc-800 rounded-md uppercase font-mono">
                              {b.id}
                            </span>
                            {isCancelled ? (
                              <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                <span>{t('manage.cancelled')}</span>
                              </span>
                            ) : isPaymentConfirmed ? (
                              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                <span>{t('paymentConfirmed')}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-[#9E741E] bg-[#FBF5E6] border border-[#D4A84B]/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{t('paymentPending')}</span>
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-base sm:text-lg text-zinc-900 mt-1">
                            {name}
                          </h3>
                          <p className="text-xs text-zinc-500">{headline}</p>
                          <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs font-medium text-zinc-800">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#0F4C5C]" />
                              <span>{formatSlot(b.slot, locale)}</span>
                            </span>
                            <span className="text-zinc-300">•</span>
                            <span className="capitalize font-semibold text-[#0F4C5C]">
                              {serviceTitle ||
                                (b.tier === 'standard' || b.tier === 'premium'
                                  ? tCommon(b.tier)
                                  : b.tier)}
                              {durationMinutes ? ` · ${durationMinutes} ${t('minutes')}` : ''} (
                              {b.price.toLocaleString()} UZS{' '}
                              {paymentMethod ? `via ${paymentMethod.toUpperCase()}` : ''})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t md:border-t-0 md:border-l border-zinc-900/[0.08] pt-4 md:pt-0 md:pl-6 flex flex-col justify-center min-w-[190px]">
                        <span className="text-[11px] text-zinc-500">
                          {t('contactLabel', { telegram: b.telegram })}
                        </span>
                        {isCancelled ? (
                          <div className="mt-2 flex items-center gap-1.5 bg-red-50 text-red-700 text-[11px] font-semibold px-3 py-2.5 rounded-xl text-center border border-red-200">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{t('manage.slotReleased')}</span>
                          </div>
                        ) : isPaymentConfirmed ? (
                          <a
                            href={meetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 btn-primary-teal inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl"
                          >
                            <span>{t('joinVideoRoom')}</span>
                            <ExternalLink className="w-3 h-3 text-[#D4A84B]" />
                          </a>
                        ) : paymentMethod === 'click' ? (
                          <button
                            type="button"
                            disabled={bookingActionId === b.id}
                            onClick={() => handleClickPayment(b)}
                            className="mt-2 btn-primary-teal inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-60"
                          >
                            {bookingActionId === b.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CreditCard className="w-3.5 h-3.5 text-[#D4A84B]" />
                            )}
                            <span>{t('manage.payWithClick')}</span>
                          </button>
                        ) : (
                          <div className="mt-2 flex items-center gap-1.5 bg-zinc-100 text-zinc-500 text-[11px] font-semibold px-3 py-2.5 rounded-xl text-center">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>{t('videoLocked')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {!isCompleted && !isCancelled && !isPaymentConfirmed && (
                      <div className="mt-4 pt-4 border-t border-zinc-900/[0.08]">
                        {bookingActionErrors[b.id] && (
                          <p className="text-[11px] text-red-600 font-semibold mb-2">
                            {bookingActionErrors[b.id]}
                          </p>
                        )}
                        {reschedulingId === b.id ? (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            {rescheduleSlots.length > 0 ? (
                              <>
                                <select
                                  value={rescheduleSlot}
                                  onChange={(event) => setRescheduleSlot(event.target.value)}
                                  className="flex-1 p-2.5 text-xs bg-[#FFF8E7]/50 border border-zinc-900/15 rounded-xl outline-none focus:border-[#0F4C5C]"
                                >
                                  {rescheduleSlots.map((slot) => (
                                    <option key={slot} value={slot}>
                                      {formatSlot(slot, locale)}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={bookingActionId === b.id}
                                  onClick={() => submitReschedule(b)}
                                  className="btn-primary-teal px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60"
                                >
                                  {bookingActionId === b.id
                                    ? t('manage.saving')
                                    : t('manage.saveTime')}
                                </button>
                              </>
                            ) : (
                              <p className="text-xs text-zinc-500">
                                {t('manage.noAlternativeSlots')}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setReschedulingId(null)}
                              className="btn-secondary-surface px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                            >
                              {t('manage.close')}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={bookingActionId === b.id}
                              onClick={() => openReschedule(b)}
                              className="btn-secondary-surface inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60"
                            >
                              {bookingActionId === b.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CalendarClock className="w-3.5 h-3.5 text-[#0F4C5C]" />
                              )}
                              <span>{t('manage.reschedule')}</span>
                            </button>
                            <button
                              type="button"
                              disabled={bookingActionId === b.id}
                              onClick={() => handleCancelBooking(b)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold cursor-pointer disabled:opacity-60"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{t('manage.cancelBooking')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {!isCompleted && !isCancelled && isPaymentConfirmed && (
                      <div className="mt-4 pt-4 border-t border-zinc-900/[0.08] text-[11px] text-zinc-500">
                        {t('manage.paidChangePolicy')}
                      </div>
                    )}

                    {isCompleted && !alreadyReviewed && (
                      <div className="mt-4 pt-4 border-t border-zinc-900/[0.08]">
                        {isReviewing ? (
                          <div className="space-y-2.5 max-w-md">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() =>
                                    setReviewDrafts((prev) => ({
                                      ...prev,
                                      [b.id]: { ...draft, rating: n },
                                    }))
                                  }
                                  className="cursor-pointer"
                                >
                                  <Star
                                    className={`w-5 h-5 ${
                                      n <= draft.rating
                                        ? 'fill-[#D4A84B] text-[#D4A84B]'
                                        : 'text-zinc-300'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                            <textarea
                              rows={3}
                              value={draft.text}
                              maxLength={2000}
                              onChange={(e) =>
                                setReviewDrafts((prev) => ({
                                  ...prev,
                                  [b.id]: { ...draft, text: e.target.value },
                                }))
                              }
                              placeholder={t('review.placeholder')}
                              className="w-full p-2.5 text-xs bg-[#FFF8E7]/50 border border-zinc-900/15 rounded-xl outline-none focus:border-[#0F4C5C]"
                            />
                            {reviewErrors[b.id] && (
                              <p className="text-[11px] text-red-600">{reviewErrors[b.id]}</p>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={reviewSubmitting === b.id}
                                onClick={() => handleSubmitReview(b)}
                                className="btn-primary-teal px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60"
                              >
                                {reviewSubmitting === b.id
                                  ? t('review.submitting')
                                  : t('review.submit')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setReviewingId(null)}
                                className="btn-secondary-surface px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                              >
                                {t('review.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReviewingId(b.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F4C5C] hover:underline cursor-pointer"
                          >
                            <MessageSquareText className="w-3.5 h-3.5" />
                            <span>{t('review.leaveReview')}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {isCompleted && alreadyReviewed && (
                      <div className="mt-4 pt-4 border-t border-zinc-900/[0.08]">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{t('review.thankYou')}</span>
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
