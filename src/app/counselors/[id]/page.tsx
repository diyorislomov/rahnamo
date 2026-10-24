'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import { Tier, Review, Counselor, CounselorService } from '@/types';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured, mapCounselorRow, PUBLIC_COUNSELOR_COLUMNS } from '@/lib/counselors';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CamelIcon } from '@/components/Icons';
import {
  Star,
  ShieldCheck,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Mail,
  Phone,
  Lock,
  Loader2,
  MessageCircleHeart,
  Send,
  LogIn,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import { announceStaleBuild, isRunningStaleBuild } from '@/lib/buildVersion';
import TextQaPanel from '@/components/TextQaPanel';
import MentorInboxPanel from '@/components/MentorInboxPanel';
import { formatSlot } from '@/lib/slots';

type PaymentMethod = 'payme' | 'click' | 'uzum';

interface BookingTicketData {
  id: string;
  counselorId: string;
  counselorName: string;
  counselorHeadline: string;
  counselorAvatar: string;
  tier: Tier;
  serviceTitle?: string;
  price: number;
  paymentMethod: PaymentMethod;
  slot: string;
  studentName: string;
  email: string;
  phone: string;
  telegram: string;
  education: string;
  question: string;
  meetLink?: string;
  paymentStatus?: 'pending' | 'confirmed' | 'rejected';
  paymentReceipt?: string;
  createdAt: string;
  locale: string;
}

interface ReviewRow {
  id: string;
  booking_id: string;
  counselor_id: string;
  student_first_name: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export default function CounselorPage() {
  const t = useTranslations('counselorProfile');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const params = useParams();
  const { data: authSession, status: authStatus } = useSession();

  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [counselor, setCounselor] = useState<Counselor | undefined>(() =>
    isSupabaseConfigured() ? undefined : INITIAL_COUNSELORS.find((c) => c.id === rawId)
  );
  const [counselorLoading, setCounselorLoading] = useState(() => isSupabaseConfigured());

  useEffect(() => {
    if (!rawId || !isSupabaseConfigured()) return;

    const sampleMatch = INITIAL_COUNSELORS.find((c) => c.id === rawId);

    Promise.resolve(
      supabase.from('counselors').select(PUBLIC_COUNSELOR_COLUMNS).eq('id', rawId).maybeSingle()
    )
      .then(({ data, error }) => {
        if (error) {
          if (sampleMatch) {
            setCounselor(sampleMatch);
            setCounselorLoading(false);
            return;
          }
          throw error;
        }
        setCounselor(data ? mapCounselorRow(data) : sampleMatch);
        setCounselorLoading(false);
      })
      .catch((error) => {
        console.error('[COUNSELOR_FETCH_FAILED]', error);
        setCounselor(sampleMatch);
        setCounselorLoading(false);
      });
  }, [rawId]);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !!url && !url.includes('placeholder');
  });
  const verifiedRating =
    reviews.length > 0
      ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
      : '—';

  useEffect(() => {
    if (!counselor || !reviewsLoading) return;

    fetch(`/api/reviews?counselorId=${encodeURIComponent(counselor.id)}`)
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && result.reviews) {
          setReviews(
            (result.reviews as ReviewRow[]).map((r) => ({
              id: r.id,
              bookingId: r.booking_id,
              counselorId: r.counselor_id,
              studentFirstName: r.student_first_name,
              rating: r.rating,
              reviewText: r.review_text,
              createdAt: r.created_at,
            }))
          );
        }
        setReviewsLoading(false);
      })
      .catch(() => setReviewsLoading(false));
  }, [counselor, reviewsLoading]);

  const [selectedTier, setSelectedTier] = useState<Tier>('standard');
  const [services, setServices] = useState<CounselorService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const selectedService = services.find((service) => service.id === selectedServiceId) || null;
  const [viewMode, setViewMode] = useState<'video' | 'text_qa'>('video');
  const [availability, setAvailability] = useState<{ counselorId: string; slots: string[] } | null>(
    null
  );
  const availableSlots =
    availability && availability.counselorId === counselor?.id
      ? availability.slots
      : counselor?.availableSlots || [];
  const [selectedSlotOverride, setSelectedSlot] = useState<string>('');
  const selectedSlot = selectedSlotOverride || availableSlots[0] || '';
  const [paymentMethod] = useState<PaymentMethod>('click');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [telegram, setTelegram] = useState('');
  const [education, setEducation] = useState('');
  const [question, setQuestion] = useState('');

  const menteeEmail: string | null | false =
    authStatus === 'loading'
      ? null
      : authStatus === 'authenticated' && authSession?.user
        ? authSession.user.email || authSession.user.name || 'mentee'
        : false;

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [bookingTicket] = useState<BookingTicketData | null>(null);
  const [copied, setCopied] = useState(false);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [cardError, setCardError] = useState('');

  useEffect(() => {
    if (!counselor) return;
    let active = true;
    fetch(`/api/counselors/${encodeURIComponent(counselor.id)}/availability`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (active && response.ok && Array.isArray(result.availableSlots)) {
          setAvailability({ counselorId: counselor.id, slots: result.availableSlots });
          setSelectedSlot((current) => (result.availableSlots.includes(current) ? current : ''));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [counselor]);

  useEffect(() => {
    if (!counselor) return;
    let active = true;
    fetch(`/api/counselors/${encodeURIComponent(counselor.id)}/services`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (active && response.ok && Array.isArray(result.services)) {
          setServices(result.services);
          if (result.services[0]?.id) {
            setSelectedServiceId(result.services[0].id);
            setSelectedTier('service');
          }
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [counselor]);

  const bookingPrice =
    selectedTier === 'service' && selectedService
      ? selectedService.price
      : selectedTier === 'standard'
        ? counselor?.standardPrice || 0
        : counselor?.premiumPrice || 0;

  if (!counselor) {
    if (counselorLoading) {
      return <div className="min-h-screen bg-[#FBF9F5]" />;
    }
    return (
      <div className="min-h-screen bg-[#FBF9F5] p-12 text-center text-[#0F1E36] font-display">
        <p className="text-xl font-bold">{t('notFound')}</p>
        <Link href="/" className="text-[#D97706] underline text-sm mt-3 inline-block">
          {tCommon('returnHome')}
        </Link>
      </div>
    );
  }

  const validateForm = (): { [key: string]: string } => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedSlot) {
      newErrors.slot = t('validation.slot');
    }

    if (!fullName.trim() || fullName.trim().length < 3) {
      newErrors.fullName = t('validation.fullName');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = t('validation.email');
    }

    let cleanedTelegram = telegram.trim().replace(/^https?:\/\/t\.me\//, '');
    if (!cleanedTelegram) {
      newErrors.telegram = t('validation.telegramRequired');
    } else {
      if (!cleanedTelegram.startsWith('@')) {
        cleanedTelegram = '@' + cleanedTelegram;
      }
      if (cleanedTelegram.length < 3) {
        newErrors.telegram = t('validation.telegramInvalid');
      }
    }

    const phoneDigits = phone.replace(/\D/g, '').replace(/^998/, '');
    if (phoneDigits.length !== 9) {
      newErrors.phone = t('validation.phone');
    }

    if (!education.trim()) {
      newErrors.education = t('validation.education');
    }

    if (!question.trim() || question.trim().length < 5) {
      newErrors.question = t('validation.question');
    }

    setErrors(newErrors);
    return newErrors;
  };

  const STEP1_FIELDS = ['slot'];
  const STEP2_FIELDS = ['fullName', 'email', 'phone', 'telegram', 'education', 'question'];

  function stepForErrors(errs: { [key: string]: string }): 1 | 2 | 3 {
    if (STEP1_FIELDS.some((f) => errs[f])) return 1;
    if (STEP2_FIELDS.some((f) => errs[f])) return 2;
    return 3;
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const digits = input.replace(/\D/g, '');
    let phoneDigits = digits.startsWith('998') ? digits.slice(3) : digits;
    phoneDigits = phoneDigits.slice(0, 9);

    let formatted = '+998';
    if (phoneDigits.length > 0) formatted += ' ' + phoneDigits.slice(0, 2);
    if (phoneDigits.length > 2) formatted += ' ' + phoneDigits.slice(2, 5);
    if (phoneDigits.length > 5) formatted += ' ' + phoneDigits.slice(5, 7);
    if (phoneDigits.length > 7) formatted += ' ' + phoneDigits.slice(7, 9);

    setPhone(formatted);
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setCurrentStep(stepForErrors(newErrors));
      return;
    }

    setIsProcessingPayment(true);
    setCardError('');

    if (await isRunningStaleBuild()) {
      announceStaleBuild();
      setIsProcessingPayment(false);
      setCardError(t('staleBuildError'));
      return;
    }

    let cleanedTelegram = telegram.trim().replace(/^https?:\/\/t\.me\//, '');
    if (!cleanedTelegram.startsWith('@')) {
      cleanedTelegram = '@' + cleanedTelegram;
    }

    if (authStatus !== 'authenticated') {
      setIsProcessingPayment(false);
      setCardError(t('bookingInsertError'));
      return;
    }

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        counselorId: counselor.id,
        tier: selectedTier,
        serviceId: selectedTier === 'service' ? selectedServiceId : undefined,
        paymentMethod,
        slot: selectedSlot,
        studentName: fullName,
        email: email.trim(),
        phone,
        telegram: cleanedTelegram,
        education,
        question,
        locale,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result?.booking) {
      setIsProcessingPayment(false);
      setCardError(
        result?.error === 'slot_unavailable' ? t('slotUnavailable') : t('bookingInsertError')
      );
      return;
    }

    const row = result.booking;
    setAvailability({
      counselorId: counselor.id,
      slots: availableSlots.filter((slot) => slot !== row.slot),
    });
    if (
      typeof result.paymentUrl !== 'string' ||
      !result.paymentUrl.startsWith('https://my.click.uz/')
    ) {
      setIsProcessingPayment(false);
      setCardError(t('bookingInsertError'));
      return;
    }

    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'booking_created', id: row.id }),
    }).catch(() => undefined);

    window.location.assign(result.paymentUrl);
  };

  const copyBookingId = () => {
    if (bookingTicket) {
      try {
        if (
          typeof navigator !== 'undefined' &&
          navigator.clipboard &&
          navigator.clipboard.writeText
        ) {
          navigator.clipboard.writeText(bookingTicket.id);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = bookingTicket.id;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#0F1E36] font-sans pb-16 selection:bg-[#F59E0B]/25">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Link
          href="/"
          className="btn-secondary-surface inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#0F1E36]" />
          <span>{t('backToCatalog')}</span>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
        {/* Left Column: Counselor Identity, Credentials & Reviews */}
        <div className="lg:col-span-5 surface-card p-6 sm:p-7 h-fit">
          <div className="flex items-start gap-4">
            <Image
              src={counselor.avatarUrl}
              alt={counselor.fullName}
              width={88}
              height={88}
              className="w-20 h-20 rounded-2xl object-cover border border-zinc-900/10 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-serif font-bold text-xl text-zinc-900 flex items-center gap-1.5">
                <span className="truncate">{counselor.fullName}</span>
                <ShieldCheck className="w-4 h-4 text-[#0F4C5C] shrink-0" />
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1 leading-relaxed">
                {counselor.headline}
              </p>
              <div className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-zinc-900 bg-[#FBF5E6] border border-[#D4A84B]/40 px-2.5 py-1 rounded-md">
                <Star className="w-3.5 h-3.5 fill-[#D4A84B] text-[#D4A84B]" />
                <span>{verifiedRating}</span>
                <span className="text-zinc-500 font-normal">
                  ({t('reviewsCountSuffix', { count: reviews.length })})
                </span>
              </div>
            </div>
          </div>

          {/* Key Credibility Stats */}
          {(counselor.responseTime || counselor.totalSessions) && (
            <div className="mt-5 pt-4 border-t border-zinc-900/[0.08] grid grid-cols-2 gap-2.5 text-[11px] font-semibold">
              {counselor.responseTime && (
                <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80 text-emerald-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{t('responseTimeSuffix', { time: counselor.responseTime })}</span>
                </div>
              )}
              {counselor.totalSessions && (
                <div className="bg-[#F5EFE0] p-2.5 rounded-xl border border-zinc-900/10 text-zinc-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0F4C5C] shrink-0" />
                  <span>{t('sessionsCountSuffix', { count: counselor.totalSessions })}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-zinc-900/[0.08]">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              {t('aboutHeading')}
            </h4>
            <p className="text-xs sm:text-sm text-zinc-700 mt-2 leading-relaxed">
              {counselor.bio}
            </p>
          </div>

          {/* Student Outcomes */}
          {counselor.outcomes && counselor.outcomes.length > 0 && (
            <div className="mt-5 pt-4 border-t border-zinc-900/[0.08]">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {t('outcomesHeading')}
              </h4>
              <div className="space-y-1.5 mt-2.5">
                {counselor.outcomes.map((out) => (
                  <div
                    key={out}
                    className="flex items-center gap-2 text-xs font-medium text-zinc-800 bg-[#F5EFE0]/70 p-2.5 rounded-xl border border-zinc-900/[0.07]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0F4C5C] shrink-0" />
                    <span>{out}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-zinc-900/[0.08]">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              {t('specialtiesHeading')}
            </h4>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {counselor.specialties.map((s) => (
                <span
                  key={s}
                  className="bg-[#0F4C5C]/[0.07] text-[#0F4C5C] text-[11px] font-semibold px-2.5 py-1 rounded-md"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {counselor.whyWorkWithMe && (
            <div className="mt-5 pt-4 border-t border-zinc-900/[0.08]">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {t('whyWorkWithMeHeading')}
              </h4>
              <p className="text-xs sm:text-sm text-zinc-700 mt-2 leading-relaxed">
                {counselor.whyWorkWithMe}
              </p>
            </div>
          )}

          {/* Verified Reviews */}
          <div className="mt-5 pt-4 border-t border-zinc-900/[0.08]">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <MessageCircleHeart className="w-3.5 h-3.5 text-[#0F4C5C]" />
              <span>{t('reviewsHeading')}</span>
            </h4>

            {reviewsLoading ? (
              <p className="text-xs text-zinc-400 mt-2">{t('reviewsLoading')}</p>
            ) : reviews.length === 0 ? (
              <div className="mt-2.5 bg-[#FFF8E7]/60 border border-zinc-900/[0.08] rounded-xl p-4 text-center">
                <p className="text-xs font-semibold text-zinc-600">{t('reviewsEmptyTitle')}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{t('reviewsEmptyBody')}</p>
              </div>
            ) : (
              <div className="space-y-2.5 mt-2.5">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-[#FFF8E7]/60 border border-zinc-900/[0.08] rounded-xl p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-900">
                        {r.studentFirstName}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < r.rating
                                ? 'fill-[#D4A84B] text-[#D4A84B]'
                                : 'text-zinc-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                      {r.reviewText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Booking Wizard or Digital Ticket */}
        <div className="lg:col-span-7">
          {counselor.pricePerQuestion != null && !bookingTicket && (
            <div className="flex gap-1.5 mb-4 bg-[#F5EFE0] border border-zinc-900/10 p-1 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setViewMode('video')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'video'
                    ? 'bg-[#0F4C5C] text-white shadow-2xs'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
              >
                {t('videoModeLabel')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('text_qa')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'text_qa'
                    ? 'bg-[#0F4C5C] text-white shadow-2xs'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
              >
                {t('textQaModeLabel')}
              </button>
            </div>
          )}

          {!bookingTicket && viewMode === 'text_qa' && counselor.pricePerQuestion != null ? (
            <TextQaPanel counselor={counselor} />
          ) : !bookingTicket && viewMode === 'video' && !menteeEmail ? (
            /* Mandatory login gate for the video booking wizard. */
            <div className="surface-card p-8 sm:p-10 text-center space-y-5">
              <div className="w-12 h-12 rounded-xl bg-[#0F4C5C] text-white flex items-center justify-center mx-auto shadow-2xs">
                <Lock className="w-5 h-5 text-[#D4A84B]" />
              </div>
              {menteeEmail === null ? (
                <p className="text-xs text-zinc-500">{t('bookingLoginGate.checking')}</p>
              ) : (
                <>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0F4C5C] bg-[#0F4C5C]/[0.08] px-3 py-1 rounded-full">
                      {t('bookingLoginGate.badge')}
                    </span>
                    <h3 className="font-serif font-bold text-xl text-zinc-900 mt-3">
                      {t('bookingLoginGate.title')}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 mt-1.5 max-w-sm mx-auto leading-relaxed">
                      {t('bookingLoginGate.subtitle')}
                    </p>
                  </div>
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/counselors/${rawId}`)}`}
                    className="btn-primary-teal inline-flex items-center gap-2 font-semibold text-xs sm:text-sm px-6 py-3 rounded-xl"
                  >
                    <LogIn className="w-4 h-4 text-[#D4A84B]" />
                    <span>{t('bookingLoginGate.cta')}</span>
                  </Link>
                </>
              )}
            </div>
          ) : bookingTicket ? (
            /* Digital Rahnamo Ticket */
            <div className="surface-card p-6 md:p-8">
              <div className="flex items-center justify-between border-b border-dashed border-zinc-900/15 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0F4C5C] flex items-center justify-center text-white">
                    <CamelIcon className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-zinc-900">
                      {t('ticket.title')}
                    </h3>
                    <p className="text-[11px] text-zinc-500">{t('ticket.subtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyBookingId}
                  className="flex items-center gap-1 text-xs font-mono font-bold bg-[#F5EFE0] hover:bg-[#EBE3D0] text-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-900/15 transition-all cursor-pointer"
                >
                  <span>{bookingTicket.id}</span>
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {copied && (
                <p className="text-[11px] text-emerald-600 font-semibold text-right mt-1">
                  {t('ticket.copiedNotice')}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 my-6 text-xs bg-[#FFF8E7]/60 p-4 rounded-xl border border-zinc-900/10">
                <div>
                  <span className="text-zinc-500 block">{t('ticket.studentLabel')}</span>
                  <span className="font-bold text-zinc-900 text-sm">
                    {bookingTicket.studentName}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">{t('ticket.counselorLabel')}</span>
                  <span className="font-bold text-zinc-900 text-sm">
                    {bookingTicket.counselorName}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">{t('ticket.slotLabel')}</span>
                  <span className="font-bold text-[#0F4C5C]">
                    {formatSlot(bookingTicket.slot, locale)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">{t('ticket.tierPaymentLabel')}</span>
                  <span className="font-bold text-[#0F4C5C] uppercase">
                    {bookingTicket.serviceTitle || bookingTicket.tier} (
                    {bookingTicket.price.toLocaleString()} UZS via{' '}
                    {bookingTicket.paymentMethod.toUpperCase()})
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-emerald-50/80 p-5 rounded-xl border border-emerald-200 text-xs text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>{t('ticket.readyTitle')}</span>
                </div>
                <p className="leading-relaxed">
                  {t.rich('ticket.emailNotice', {
                    email: bookingTicket.email,
                    b: (chunks) => <span className="font-bold">{chunks}</span>,
                  })}
                </p>

                <div className="bg-[#FBF5E6] border border-[#D4A84B]/50 rounded-xl p-3.5 flex items-start gap-2.5">
                  <Send className="w-4 h-4 text-[#9E741E] shrink-0 mt-0.5" />
                  <p className="text-zinc-900 leading-relaxed">
                    {t('ticket.sendReceiptPrefix')}{' '}
                    <a
                      href={`https://t.me/rahnamo_admin?start=${bookingTicket.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#0F4C5C] hover:underline underline-offset-2"
                    >
                      @rahnamo_admin
                    </a>{' '}
                    {t('ticket.sendReceiptMiddle')}{' '}
                    <button
                      type="button"
                      onClick={copyBookingId}
                      className="inline-flex items-center gap-1 font-mono font-bold bg-white hover:bg-[#F5EFE0] text-zinc-900 px-2 py-0.5 rounded-md border border-zinc-900/15 transition-all cursor-pointer align-middle"
                    >
                      <span>{bookingTicket.id}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                    {copied && (
                      <span className="ml-2 text-[11px] text-emerald-600 font-semibold">
                        {t('ticket.copiedShort')}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-zinc-600 bg-white/80 border border-zinc-200 rounded-xl p-3">
                  <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>{t('ticket.videoPendingNotice')}</span>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap gap-2">
                  <a
                    href={`https://t.me/rahnamo_admin?start=${bookingTicket.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-[#0F4C5C] hover:bg-[#09323D] text-white px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer text-xs"
                  >
                    <span>{t('ticket.telegramCta')}</span>
                  </a>
                  <Link
                    href="/my-bookings"
                    className="inline-flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer text-xs"
                  >
                    <span>{t('ticket.viewBookingsCta')}</span>
                  </Link>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/my-bookings"
                  className="btn-primary-teal flex-1 text-center font-semibold text-xs py-3 rounded-xl"
                >
                  {t('ticket.viewInMyBookings')}
                </Link>
                <Link
                  href="/"
                  className="btn-secondary-surface flex-1 text-center font-semibold text-xs py-3 rounded-xl"
                >
                  {tCommon('returnHome')}
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleInitiatePayment}
              className="surface-card p-6 sm:p-8 space-y-6"
            >
              {/* Step Indicator */}
              <div className="flex items-center gap-2 pb-2">
                {([1, 2, 3] as const).map((step, i) => (
                  <div key={step} className="flex items-center flex-1 last:flex-none">
                    <button
                      type="button"
                      onClick={() => {
                        if (step < currentStep) setCurrentStep(step);
                      }}
                      disabled={step > currentStep}
                      className={`w-8 h-8 shrink-0 rounded-lg text-xs font-mono font-bold flex items-center justify-center border transition-all ${
                        step === currentStep
                          ? 'bg-[#0F4C5C] border-[#0F4C5C] text-white'
                          : step < currentStep
                            ? 'bg-[#F5EFE0] border-[#0F4C5C] text-[#0F4C5C] cursor-pointer hover:bg-[#EBE3D0]'
                            : 'bg-white border-zinc-900/15 text-zinc-400'
                      }`}
                    >
                      {step < currentStep ? <CheckCircle2 className="w-4 h-4" /> : `0${step}`}
                    </button>
                    {i < 2 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 rounded-full transition-all ${
                          step < currentStep ? 'bg-[#0F4C5C]' : 'bg-zinc-900/10'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Tier & Service Selection */}
              <div className={currentStep === 1 ? '' : 'hidden'}>
                <h3 className="font-serif text-lg font-bold text-zinc-900">
                  {t('form.step1Heading')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {services.map((service) => {
                    const isSelected =
                      selectedTier === 'service' && selectedServiceId === service.id;
                    return (
                      <label
                        key={service.id}
                        className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-[#0F4C5C] bg-[#0F4C5C]/[0.05] ring-1 ring-[#0F4C5C]/20'
                            : 'border-zinc-900/12 bg-white hover:bg-[#FFF8E7]/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tier"
                          value={service.id}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedTier('service');
                            setSelectedServiceId(service.id);
                          }}
                          className="mt-1 accent-[#0F4C5C] cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-[#0F4C5C] block">
                            {service.title}
                          </span>
                          <div className="text-base font-mono font-bold text-zinc-900 mt-0.5">
                            {service.price.toLocaleString()} UZS
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#0F4C5C]" />
                            <span>
                              {service.durationMinutes} {t('form.minutes')}
                            </span>
                          </p>
                          {service.description && (
                            <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}

                  <label
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-3 ${
                      selectedTier === 'standard'
                        ? 'border-[#0F4C5C] bg-[#0F4C5C]/[0.05] ring-1 ring-[#0F4C5C]/20'
                        : 'border-zinc-900/12 bg-white hover:bg-[#FFF8E7]/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value="standard"
                      checked={selectedTier === 'standard'}
                      onChange={() => {
                        setSelectedTier('standard');
                        setSelectedServiceId('');
                      }}
                      className="mt-1 accent-[#0F4C5C] cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#0F4C5C] uppercase tracking-wider block">
                        {tCommon('standard')}
                      </span>
                      <div className="text-base font-mono font-bold text-zinc-900 mt-0.5">
                        {counselor.standardPrice.toLocaleString()} UZS
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#0F4C5C]" />
                        <span>{t('form.tierStandardDuration')}</span>
                      </p>
                    </div>
                  </label>

                  <label
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-3 ${
                      selectedTier === 'premium'
                        ? 'border-[#0F4C5C] bg-[#0F4C5C]/[0.05] ring-1 ring-[#0F4C5C]/20'
                        : 'border-zinc-900/12 bg-white hover:bg-[#FFF8E7]/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value="premium"
                      checked={selectedTier === 'premium'}
                      onChange={() => {
                        setSelectedTier('premium');
                        setSelectedServiceId('');
                      }}
                      className="mt-1 accent-[#0F4C5C] cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#9E741E] uppercase tracking-wider block">
                        {tCommon('premium')}
                      </span>
                      <div className="text-base font-mono font-bold text-zinc-900 mt-0.5">
                        {counselor.premiumPrice.toLocaleString()} UZS
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#0F4C5C]" />
                        <span>{t('form.tierPremiumDuration')}</span>
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Step 1B: Slot Selection */}
              <div className={currentStep === 1 ? '' : 'hidden'}>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-zinc-900">
                    {t('form.step2Heading')}
                  </h3>
                  {errors.slot && (
                    <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.slot}</span>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                  {availableSlots.length === 0 && (
                    <p className="sm:col-span-2 text-xs text-zinc-500 bg-[#FFF8E7]/60 border border-zinc-900/10 rounded-xl p-4 text-center">
                      {t('noAvailableSlots')}
                    </p>
                  )}
                  {availableSlots.map((slot) => (
                    <label
                      key={slot}
                      className={`cursor-pointer p-3 rounded-xl text-xs font-medium border transition-all flex items-center gap-2.5 ${
                        selectedSlot === slot
                          ? 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-2xs'
                          : 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="slot"
                        value={slot}
                        checked={selectedSlot === slot}
                        onChange={() => {
                          setSelectedSlot(slot);
                          if (errors.slot) setErrors((prev) => ({ ...prev, slot: '' }));
                        }}
                        className="accent-[#D4A84B] cursor-pointer"
                      />
                      <span>{formatSlot(slot, locale)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {currentStep === 1 && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="btn-primary-teal font-semibold text-xs px-6 py-3 rounded-xl cursor-pointer"
                  >
                    {t('form.continueButton')}
                  </button>
                </div>
              )}

              {/* Step 2: Intake Questions */}
              <div
                className={`space-y-4 pt-4 border-t border-zinc-900/[0.08] ${
                  currentStep === 2 ? '' : 'hidden'
                }`}
              >
                <h3 className="font-serif text-lg font-bold text-zinc-900">
                  {t('form.step3Heading')}
                </h3>

                <div>
                  <label
                    htmlFor="student-fullname"
                    className="text-xs font-semibold text-zinc-700 block"
                  >
                    {t('form.fullNameLabel')}
                  </label>
                  <input
                    id="student-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors({ ...errors, fullName: '' });
                    }}
                    placeholder={t('form.fullNamePlaceholder')}
                    className={`w-full mt-1.5 px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border rounded-xl outline-none transition-all ${
                      errors.fullName
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-zinc-900/15 focus:bg-white focus:border-[#0F4C5C] text-zinc-900'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="student-email"
                    className="text-xs font-semibold text-zinc-700 flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3 text-zinc-500" />
                    <span>{t('form.emailLabel')}</span>
                  </label>
                  <input
                    id="student-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    maxLength={254}
                    autoComplete="email"
                    placeholder={t('form.emailPlaceholder')}
                    className={`w-full mt-1.5 px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border rounded-xl outline-none transition-all ${
                      errors.email
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-zinc-900/15 text-zinc-900 focus:bg-white focus:border-[#0F4C5C]'
                    }`}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="student-phone"
                    className="text-xs font-semibold text-zinc-700 flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3 text-zinc-500" />
                    <span>{t('form.phoneLabel')}</span>
                  </label>
                  <input
                    id="student-phone"
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder={t('form.phonePlaceholder')}
                    className={`w-full mt-1.5 px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border rounded-xl outline-none transition-all ${
                      errors.phone
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-zinc-900/15 focus:bg-white focus:border-[#0F4C5C] text-zinc-900'
                    }`}
                  />
                  {errors.phone && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="student-telegram"
                    className="text-xs font-semibold text-zinc-700 block"
                  >
                    {t('form.telegramLabel')}
                  </label>
                  <input
                    id="student-telegram"
                    type="text"
                    value={telegram}
                    onChange={(e) => {
                      setTelegram(e.target.value);
                      if (errors.telegram) setErrors((prev) => ({ ...prev, telegram: '' }));
                    }}
                    placeholder={t('form.telegramPlaceholder')}
                    className={`w-full mt-1.5 px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border rounded-xl outline-none transition-all ${
                      errors.telegram
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-zinc-900/15 focus:bg-white focus:border-[#0F4C5C] text-zinc-900'
                    }`}
                  />
                  {errors.telegram && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.telegram}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="student-education"
                    className="text-xs font-semibold text-zinc-700 block"
                  >
                    {t('form.educationLabel')}
                  </label>
                  <input
                    id="student-education"
                    type="text"
                    value={education}
                    onChange={(e) => {
                      setEducation(e.target.value);
                      if (errors.education) setErrors((prev) => ({ ...prev, education: '' }));
                    }}
                    placeholder={t('form.educationPlaceholder')}
                    className={`w-full mt-1.5 px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border rounded-xl outline-none transition-all ${
                      errors.education
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-zinc-900/15 focus:bg-white focus:border-[#0F4C5C] text-zinc-900'
                    }`}
                  />
                  {errors.education && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.education}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="student-question"
                    className="text-xs font-semibold text-zinc-700 block"
                  >
                    {t('form.questionLabel')}
                  </label>
                  <textarea
                    id="student-question"
                    rows={3}
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      if (errors.question) setErrors((prev) => ({ ...prev, question: '' }));
                    }}
                    placeholder={t('form.questionPlaceholder')}
                    className={`w-full mt-1.5 px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border rounded-xl outline-none transition-all ${
                      errors.question
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-zinc-900/15 focus:bg-white focus:border-[#0F4C5C] text-zinc-900'
                    }`}
                  />
                  {errors.question && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.question}</p>
                  )}
                </div>
              </div>

              {currentStep === 2 && (
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="btn-secondary-surface font-semibold text-xs px-6 py-3 rounded-xl cursor-pointer"
                  >
                    {t('form.backButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="btn-primary-teal font-semibold text-xs px-6 py-3 rounded-xl cursor-pointer"
                  >
                    {t('form.continueButton')}
                  </button>
                </div>
              )}

              {/* Step 3: Payment Gateway Confirmation */}
              <div
                className={`space-y-3 pt-4 border-t border-zinc-900/[0.08] ${
                  currentStep === 3 ? '' : 'hidden'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-zinc-900">
                    {t('form.step4Heading')}
                  </h3>
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-700" />
                    <span>{t('form.securePayment')}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 rounded-xl border border-[#0F1E36] bg-[#0F1E36]/[0.05] ring-1 ring-[#0F1E36]/20 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-sm text-[#0F1E36] block">Click</span>
                      <span className="text-xs text-[#475569]">{t('form.clickSubLabel')}</span>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-[#D97706]" />
                  </div>

                  {/* Stage 1 Marketplace Commission & Escrow Breakdown (Master Plan Section 8) */}
                  <div className="rounded-xl bg-[#FBF9F5] border border-[#0F1E36]/12 p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-[11px] text-[#475569]">
                      <span>85% Mentor Payout (Rahnamo Honorarium)</span>
                      <span className="font-bold text-[#0F1E36]">
                        {Math.round(bookingPrice * 0.85).toLocaleString()} UZS
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px] text-[#475569]">
                      <span>15% Platform Escrow & Session Guarantee</span>
                      <span className="font-bold text-[#D97706]">
                        {Math.round(bookingPrice * 0.15).toLocaleString()} UZS
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-[#0F1E36]/10 flex items-center justify-between font-mono text-xs font-extrabold text-[#0F1E36]">
                      <span>Total Session Price</span>
                      <span>{bookingPrice.toLocaleString()} UZS</span>
                    </div>
                  </div>
                </div>
                {cardError && (
                  <p className="text-xs text-red-600 font-semibold">{cardError}</p>
                )}
              </div>

              {currentStep === 3 && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="btn-secondary-surface sm:w-auto font-semibold text-xs px-6 py-3 rounded-xl cursor-pointer"
                  >
                    {t('form.backButton')}
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="btn-primary-teal flex-1 py-3.5 font-semibold text-sm rounded-xl cursor-pointer disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('modal.processing')}</span>
                      </>
                    ) : (
                      t('form.submit', { price: bookingPrice.toLocaleString() })
                    )}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {counselor.pricePerQuestion != null && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
          <MentorInboxPanel />
        </div>
      )}

      <Footer />
    </div>
  );
}
