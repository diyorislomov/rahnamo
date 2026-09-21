'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import { Tier, Review, Counselor } from '@/types';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured, mapCounselorRow } from '@/lib/counselors';
import { getDeviceId } from '@/lib/deviceId';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CamelIcon } from '@/components/Icons';
import { Star, ShieldCheck, ArrowLeft, Clock, CheckCircle2, AlertCircle, Copy, Mail, Phone, CreditCard, Lock, Loader2, X, MessageCircleHeart, Send } from 'lucide-react';
import Link from 'next/link';

import { generateMeetLink } from '@/lib/meeting';
import { sendTelegramNotification } from '@/lib/telegram';
import { announceStaleBuild, isRunningStaleBuild } from '@/lib/buildVersion';

type PaymentMethod = 'payme' | 'click' | 'uzum';

interface BookingTicketData {
  id: string;
  counselorId: string;
  counselorName: string;
  counselorHeadline: string;
  counselorAvatar: string;
  tier: Tier;
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
  // Captured once, here, from this browser's own active locale -- never
  // re-derived later from whichever session's cookie eventually triggers
  // the payment-confirmed email (that's the admin's browser, not the
  // student's, and often much later).
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
  const router = useRouter();
  
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // Seed from the mock list (instant, no flash), then let a real Supabase
  // row -- covering a newly approved counselor who was never in the mock
  // list at all -- override it once the fetch resolves.
  const [counselor, setCounselor] = useState<Counselor | undefined>(() =>
    INITIAL_COUNSELORS.find((c) => c.id === rawId)
  );
  const [counselorLoading, setCounselorLoading] = useState(() => isSupabaseConfigured());

  useEffect(() => {
    if (!rawId || !isSupabaseConfigured()) return;

    Promise.resolve(supabase.from('counselors').select('*').eq('id', rawId).maybeSingle())
      .then(({ data, error }) => {
        if (!error && data) {
          setCounselor((prev) => (prev ? { ...prev, ...mapCounselorRow(data) } : mapCounselorRow(data)));
        }
        setCounselorLoading(false);
      })
      .catch(() => setCounselorLoading(false));
  }, [rawId]);

  // Reviews — read-only for now, no submission flow exists yet. Empty by
  // default; only ever populated by real Supabase rows, never fabricated.
  // `reviewsLoading` starts true only if a fetch will actually happen, so the
  // effect never needs to flip it synchronously — only from inside the async
  // `.then` callback below.
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !!url && !url.includes('placeholder');
  });

  useEffect(() => {
    if (!counselor || !reviewsLoading) return;

    supabase
      .from('reviews')
      .select('*')
      .eq('counselor_id', counselor.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setReviews(
            (data as ReviewRow[]).map((r) => ({
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
      });
  }, [counselor, reviewsLoading]);

  const [selectedTier, setSelectedTier] = useState<Tier>('standard');
  // Derived, not stateful -- so it stays correct if the live Supabase fetch
  // above changes counselor.availableSlots after this component already
  // mounted (e.g. the mock had no match but the live row does).
  const [selectedSlotOverride, setSelectedSlot] = useState<string>('');
  const selectedSlot = selectedSlotOverride || counselor?.availableSlots?.[0] || '';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('payme');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [telegram, setTelegram] = useState('');
  const [education, setEducation] = useState('');
  const [question, setQuestion] = useState('');

  // Errors & Ticket state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [bookingTicket, setBookingTicket] = useState<BookingTicketData | null>(null);
  const [copied, setCopied] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [copiedCard, setCopiedCard] = useState(false);
  const [cardError, setCardError] = useState('');

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = rawDigits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
    if (cardError) setCardError('');
  };

  if (!counselor) {
    if (counselorLoading) {
      return <div className="min-h-screen bg-[#FAF6EE]" />;
    }
    return (
      <div className="min-h-screen bg-[#FAF6EE] p-12 text-center text-amber-950 font-serif">
        <p className="text-xl font-bold">{t('notFound')}</p>
        <Link href="/" className="text-amber-800 underline text-sm mt-3 inline-block">
          {tCommon('returnHome')}
        </Link>
      </div>
    );
  }

  const validateForm = () => {
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
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
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

  const handleInitiatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    const rawCardDigits = cardNumber.replace(/\D/g, '');
    if (rawCardDigits.length !== 16) {
      setCardError(t('modal.cardError'));
      return;
    }

    setIsProcessingPayment(true);
    setCardError('');

    // A tab open since before a deploy runs its old JS forever -- ordinary
    // navigation never reloads it. That's the exact class of bug that
    // produced a real "successful" ticket for a booking that was never
    // written anywhere: the stale code's env check silently skipped the
    // whole Supabase branch. Checked here, first, before anything else in
    // this function touches state or storage.
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

    const bookingId = `RNM-${Math.floor(1000 + Math.random() * 9000)}`;
    const price = selectedTier === 'standard' ? counselor.standardPrice : counselor.premiumPrice;
    const meetLink = generateMeetLink(bookingId);

    const newBooking: BookingTicketData = {
      id: bookingId,
      counselorId: counselor.id,
      counselorName: counselor.fullName,
      counselorHeadline: counselor.headline,
      counselorAvatar: counselor.avatarUrl,
      tier: selectedTier,
      price: price,
      paymentMethod: paymentMethod,
      slot: selectedSlot,
      studentName: fullName,
      email: email,
      phone: phone,
      telegram: cleanedTelegram,
      education: education,
      question: question,
      meetLink: meetLink,
      paymentStatus: 'pending',
      paymentReceipt: receiptRef.trim() || cardNumber.trim() || 'KARTA_OTKAZMASI',
      createdAt: new Date().toISOString(),
      locale,
    };

    // Save to LocalStorage immediately
    try {
      const existing = JSON.parse(localStorage.getItem('rahnamo_bookings') || '[]');
      localStorage.setItem('rahnamo_bookings', JSON.stringify([newBooking, ...existing]));
    } catch (err) {
      console.error('LocalStorage save error:', err);
    }

    // Telegram alert to admin -- secondary channel, never blocks the booking
    // itself. Its own resolved-false case (not just a thrown error) is now
    // logged distinctly so a silent Telegram failure doesn't go unnoticed.
    sendTelegramNotification({
      id: newBooking.id,
      studentName: newBooking.studentName,
      counselorName: newBooking.counselorName,
      tier: newBooking.tier,
      price: newBooking.price,
      slot: newBooking.slot,
      paymentMethod: newBooking.paymentMethod,
      phone: newBooking.phone,
      telegram: newBooking.telegram,
      email: newBooking.email,
      education: newBooking.education,
      question: newBooking.question,
      meetLink: newBooking.meetLink || meetLink,
    })
      .then((ok) => {
        if (!ok) console.error('[TELEGRAM_NOTIFY_FAILED] booking created, admin alert did not send:', newBooking.id);
      })
      .catch((err) => console.error('[TELEGRAM_NOTIFY_FAILED] booking created, threw:', newBooking.id, err));

    // Send Email Receipt (non-blocking -- a best-effort courtesy copy of what
    // the on-screen ticket already tells the student; not the core write).
    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'booking_created',
        id: newBooking.id,
        studentName: newBooking.studentName,
        counselorName: newBooking.counselorName,
        tier: newBooking.tier,
        price: newBooking.price,
        slot: newBooking.slot,
        paymentMethod: newBooking.paymentMethod,
        email: newBooking.email,
        telegram: newBooking.telegram,
        question: newBooking.question,
        meetLink: newBooking.meetLink || meetLink,
        locale: newBooking.locale,
      }),
    }).catch((err) => console.warn('Email receipt error:', err));

    // The booking write itself -- this is the core function of the entire
    // platform. Awaited on purpose: a success ticket must never appear
    // unless this actually persisted, since that was the exact silent-failure
    // incident this whole session traced back to a misconfigured connection.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const { error } = await supabase.from('bookings').insert({
        id: newBooking.id,
        device_id: getDeviceId(),
        counselor_id: newBooking.counselorId,
        counselor_name: newBooking.counselorName,
        counselor_headline: newBooking.counselorHeadline,
        counselor_avatar: newBooking.counselorAvatar,
        tier: newBooking.tier,
        price: newBooking.price,
        payment_method: newBooking.paymentMethod,
        slot: newBooking.slot,
        student_name: newBooking.studentName,
        email: newBooking.email,
        phone: newBooking.phone,
        telegram: newBooking.telegram,
        education: newBooking.education,
        question: newBooking.question,
        meet_link: newBooking.meetLink,
        locale: newBooking.locale,
      });

      if (error) {
        console.error('[BOOKING_INSERT_FAILED]', newBooking.id, error);
        // Undo the optimistic localStorage write -- it must not look booked
        // anywhere (including this device's own /my-bookings) if the
        // authoritative write never actually happened.
        try {
          const existing = JSON.parse(localStorage.getItem('rahnamo_bookings') || '[]');
          localStorage.setItem(
            'rahnamo_bookings',
            JSON.stringify(existing.filter((b: BookingTicketData) => b.id !== newBooking.id))
          );
        } catch (err) {
          console.error(err);
        }
        setIsProcessingPayment(false);
        setCardError(t('bookingInsertError'));
        return;
      }
    }

    setIsProcessingPayment(false);
    setShowPaymentModal(false);
    setBookingTicket(newBooking);
  };

  const copyBookingId = () => {
    if (bookingTicket) {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
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

  const getProviderName = () => {
    switch (paymentMethod) {
      case 'payme':
        return 'Payme';
      case 'click':
        return 'Click';
      case 'uzum':
        return 'Uzum Bank';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans pb-16 selection:bg-amber-200">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 hover:text-amber-700 bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-300/60 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> {t('backToCatalog')}
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {/* Left Column: Counselor Profile Card */}
        <div className="md:col-span-1 bg-white/95 p-6 rounded-3xl border border-amber-900/10 shadow-sm h-fit">
          <img
            src={counselor.avatarUrl}
            alt={counselor.fullName}
            className="w-24 h-24 rounded-2xl object-cover mx-auto border-2 border-amber-200 shadow-xs"
          />
          <div className="text-center mt-4">
            <h2 className="font-serif font-bold text-lg text-amber-950 flex items-center justify-center gap-1.5">
              {counselor.fullName}
              <ShieldCheck className="w-4 h-4 text-amber-700 fill-amber-100" />
            </h2>
            <p className="text-xs text-stone-600 mt-1">{counselor.headline}</p>
            <div className="flex items-center justify-center gap-1 mt-2 text-xs font-semibold text-amber-800">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{counselor.rating}</span>
              <span className="text-stone-400 font-normal">({t('reviewsCountSuffix', { count: counselor.reviewsCount })})</span>
            </div>
          </div>

          {/* Mentor Cruise Key Stats */}
          <div className="mt-4 pt-4 border-t border-amber-900/10 grid grid-cols-2 gap-2 text-[11px] font-semibold text-amber-950">
            {counselor.responseTime && (
              <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                <span>{t('responseTimeSuffix', { time: counselor.responseTime })}</span>
              </div>
            )}
            {counselor.totalSessions && (
              <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-200 text-amber-900 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                <span>{t('sessionsCountSuffix', { count: counselor.totalSessions })}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-amber-900/10">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900/70">{t('aboutHeading')}</h4>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">{counselor.bio}</p>
          </div>

          {/* Student Outcomes */}
          {counselor.outcomes && counselor.outcomes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-900/10">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900/70">{t('outcomesHeading')}</h4>
              <div className="space-y-1.5 mt-2">
                {counselor.outcomes.map((out) => (
                  <div key={out} className="flex items-center gap-1.5 text-[11px] font-medium text-amber-950 bg-amber-50 p-2 rounded-xl border border-amber-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                    <span>{out}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-amber-900/10">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900/70">{t('specialtiesHeading')}</h4>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {counselor.specialties.map((s) => (
                <span key={s} className="bg-amber-50 border border-amber-200/70 text-amber-900 text-[10px] font-medium px-2 py-0.5 rounded-md">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Why work with me — only shown once a counselor has actually written one */}
          {counselor.whyWorkWithMe && (
            <div className="mt-4 pt-4 border-t border-amber-900/10">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900/70">
                {t('whyWorkWithMeHeading')}
              </h4>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">{counselor.whyWorkWithMe}</p>
            </div>
          )}

          {/* Reviews — real data only. No submitted reviews exist yet, so this is
              an honest empty state, not a placeholder testimonial. */}
          <div className="mt-4 pt-4 border-t border-amber-900/10">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900/70 flex items-center gap-1.5">
              <MessageCircleHeart className="w-3.5 h-3.5 text-amber-700" />
              {t('reviewsHeading')}
            </h4>

            {reviewsLoading ? (
              <p className="text-[11px] text-stone-400 mt-2">{t('reviewsLoading')}</p>
            ) : reviews.length === 0 ? (
              <div className="mt-2 bg-amber-50/60 border border-amber-900/10 rounded-xl p-3 text-center">
                <p className="text-[11px] font-semibold text-stone-500">{t('reviewsEmptyTitle')}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  {t('reviewsEmptyBody')}
                </p>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {reviews.map((r) => (
                  <div key={r.id} className="bg-amber-50/60 border border-amber-900/10 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-950">{r.studentFirstName}</span>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < r.rating ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">{r.reviewText}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Form or Digital Ticket */}
        <div className="md:col-span-2">
          {bookingTicket ? (
            /* Digital Rahnamo Ticket */
            <div className="bg-white/95 rounded-3xl border-2 border-amber-900/20 p-6 md:p-8 shadow-md">
              <div className="flex items-center justify-between border-b border-dashed border-amber-900/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-900 flex items-center justify-center text-amber-100">
                    <CamelIcon className="w-5 h-5 fill-amber-100" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-amber-950">{t('ticket.title')}</h3>
                    <p className="text-[11px] text-stone-500">{t('ticket.subtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyBookingId}
                  className="flex items-center gap-1 text-xs font-mono font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 px-3 py-1.5 rounded-lg border border-amber-300 transition-all cursor-pointer"
                >
                  <span>{bookingTicket.id}</span>
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {copied && <p className="text-[11px] text-emerald-600 font-semibold text-right mt-1">{t('ticket.copiedNotice')}</p>}

              <div className="grid grid-cols-2 gap-4 my-6 text-xs bg-amber-50/60 p-4 rounded-2xl border border-amber-900/10">
                <div>
                  <span className="text-stone-500 block">{t('ticket.studentLabel')}</span>
                  <span className="font-bold text-amber-950 text-sm">{bookingTicket.studentName}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">{t('ticket.counselorLabel')}</span>
                  <span className="font-bold text-amber-950 text-sm">{bookingTicket.counselorName}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">{t('ticket.slotLabel')}</span>
                  <span className="font-bold text-amber-900">{bookingTicket.slot}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">{t('ticket.tierPaymentLabel')}</span>
                  <span className="font-bold text-amber-900 uppercase">
                    {bookingTicket.tier} ({bookingTicket.price.toLocaleString()} UZS via {bookingTicket.paymentMethod.toUpperCase()})
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-emerald-50/80 p-5 rounded-2xl border border-emerald-200 text-xs text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-700" />
                  {t('ticket.readyTitle')}
                </div>
                <p className="leading-relaxed">
                  {t.rich('ticket.emailNotice', {
                    email: bookingTicket.email,
                    b: (chunks) => <span className="font-bold">{chunks}</span>,
                  })}
                </p>

                {/* The single most important next action -- called out on its
                    own, with the booking ID immediately copyable right here,
                    rather than folded into the paragraph above where a
                    student skimming past the confirmation could miss it. */}
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3.5 flex items-start gap-2.5">
                  <Send className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-950 leading-relaxed">
                    {t('ticket.sendReceiptPrefix')}{' '}
                    <a
                      href={`https://t.me/rahnamo_admin?start=${bookingTicket.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-sky-700 hover:text-sky-800 underline underline-offset-2"
                    >
                      @rahnamo_admin
                    </a>{' '}
                    {t('ticket.sendReceiptMiddle')}{' '}
                    <button
                      type="button"
                      onClick={copyBookingId}
                      className="inline-flex items-center gap-1 font-mono font-bold bg-white hover:bg-amber-100 text-amber-950 px-2 py-0.5 rounded-md border border-amber-300 transition-all cursor-pointer align-middle"
                    >
                      <span>{bookingTicket.id}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                    {copied && <span className="ml-2 text-[11px] text-emerald-600 font-semibold">{t('ticket.copiedShort')}</span>}
                  </p>
                </div>

                {/* Video link is deliberately withheld until an admin has
                    actually verified the payment proof above -- it never
                    ships in the booking-created email either, so this is
                    the honest state right now, not a placeholder. */}
                <div className="flex items-center gap-2 text-stone-600 bg-white/70 border border-stone-200 rounded-xl p-3">
                  <Lock className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                  <span>{t('ticket.videoPendingNotice')}</span>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap gap-2">
                  <a
                    href={`https://t.me/rahnamo_admin?start=${bookingTicket.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer text-xs"
                  >
                    <span>{t('ticket.telegramCta')}</span>
                  </a>
                  <Link
                    href="/my-bookings"
                    className="inline-flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer text-xs"
                  >
                    <span>{t('ticket.viewBookingsCta')}</span>
                  </Link>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/my-bookings"
                  className="flex-1 text-center bg-amber-900 hover:bg-amber-800 text-amber-50 font-semibold text-xs py-3 rounded-xl transition-all shadow-xs"
                >
                  {t('ticket.viewInMyBookings')}
                </Link>
                <Link
                  href="/"
                  className="flex-1 text-center bg-white border border-amber-900/20 text-stone-800 hover:bg-amber-50 font-semibold text-xs py-3 rounded-xl transition-all"
                >
                  {tCommon('returnHome')}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInitiatePayment} className="bg-white/95 p-6 md:p-8 rounded-3xl border border-amber-900/10 shadow-sm space-y-6">
              {/* 1. Tier Selection */}
              <div>
                <h3 className="font-serif text-lg font-bold text-amber-950">{t('form.step1Heading')}</h3>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <label
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                      selectedTier === 'standard'
                        ? 'border-amber-800 bg-amber-50/70 ring-2 ring-amber-800/20'
                        : 'border-amber-900/10 hover:bg-amber-50/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value="standard"
                      checked={selectedTier === 'standard'}
                      onChange={() => setSelectedTier('standard')}
                      className="mt-1 accent-amber-800 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">{tCommon('standard')}</span>
                      <div className="text-lg font-serif font-extrabold text-amber-950 mt-0.5">{counselor.standardPrice.toLocaleString()} UZS</div>
                      <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" /> {t('form.tierStandardDuration')}
                      </p>
                    </div>
                  </label>

                  <label
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                      selectedTier === 'premium'
                        ? 'border-amber-800 bg-amber-50/70 ring-2 ring-amber-800/20'
                        : 'border-amber-900/10 hover:bg-amber-50/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value="premium"
                      checked={selectedTier === 'premium'}
                      onChange={() => setSelectedTier('premium')}
                      className="mt-1 accent-amber-800 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">{tCommon('premium')}</span>
                      <div className="text-lg font-serif font-extrabold text-amber-950 mt-0.5">{counselor.premiumPrice.toLocaleString()} UZS</div>
                      <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" /> {t('form.tierPremiumDuration')}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. Slot Selection */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-amber-950">{t('form.step2Heading')}</h3>
                  {errors.slot && (
                    <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.slot}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {counselor.availableSlots.map((slot) => (
                    <label
                      key={slot}
                      className={`cursor-pointer p-3 rounded-xl text-xs font-medium border transition-all flex items-center gap-2.5 ${
                        selectedSlot === slot
                          ? 'bg-amber-900 text-amber-50 border-amber-900 shadow-xs'
                          : 'bg-white text-stone-700 border-amber-900/15 hover:bg-amber-50/50'
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
                        className="accent-amber-500 cursor-pointer"
                      />
                      <span>{slot}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. Validated Intake Questions */}
              <div className="space-y-4 pt-4 border-t border-amber-900/10">
                <h3 className="font-serif text-lg font-bold text-amber-950">{t('form.step3Heading')}</h3>

                {/* Name */}
                <div>
                  <label htmlFor="student-fullname" className="text-xs font-semibold text-stone-700 block">
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
                    className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                      errors.fullName ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                    }`}
                  />
                  {errors.fullName && <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="student-email" className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-stone-500" /> {t('form.emailLabel')}
                  </label>
                  <input
                    id="student-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder={t('form.emailPlaceholder')}
                    className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                      errors.email ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                    }`}
                  />
                  {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="student-phone" className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-stone-500" /> {t('form.phoneLabel')}
                  </label>
                  <input
                    id="student-phone"
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder={t('form.phonePlaceholder')}
                    className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                      errors.phone ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                    }`}
                  />
                  {errors.phone && <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
                </div>

                {/* Telegram */}
                <div>
                  <label htmlFor="student-telegram" className="text-xs font-semibold text-stone-700 block">
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
                    className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                      errors.telegram ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                    }`}
                  />
                  {errors.telegram && <p className="text-[11px] text-red-600 mt-1">{errors.telegram}</p>}
                </div>

                {/* Current Status */}
                <div>
                  <label htmlFor="student-education" className="text-xs font-semibold text-stone-700 block">
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
                    className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                      errors.education ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                    }`}
                  />
                  {errors.education && <p className="text-[11px] text-red-600 mt-1">{errors.education}</p>}
                </div>

                {/* Question */}
                <div>
                  <label htmlFor="student-question" className="text-xs font-semibold text-stone-700 block">
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
                    className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                      errors.question ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                    }`}
                  />
                  {errors.question && <p className="text-[11px] text-red-600 mt-1">{errors.question}</p>}
                </div>
              </div>

              {/* 4. Payment Gateway Selection Step */}
              <div className="space-y-3 pt-4 border-t border-amber-900/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-amber-950">{t('form.step4Heading')}</h3>
                  <span className="text-[11px] text-stone-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-700" /> {t('form.securePayment')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <label
                    className={`cursor-pointer p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                      paymentMethod === 'payme'
                        ? 'border-amber-800 bg-amber-50/80 ring-2 ring-amber-800/20 shadow-xs'
                        : 'border-amber-900/10 hover:bg-amber-50/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="payme"
                      checked={paymentMethod === 'payme'}
                      onChange={() => setPaymentMethod('payme')}
                      className="sr-only"
                    />
                    <span className="font-bold text-xs text-amber-950 block">Payme</span>
                    <span className="text-[10px] text-stone-500">{t('form.paymeSubLabel')}</span>
                  </label>

                  <label
                    className={`cursor-pointer p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                      paymentMethod === 'click'
                        ? 'border-amber-800 bg-amber-50/80 ring-2 ring-amber-800/20 shadow-xs'
                        : 'border-amber-900/10 hover:bg-amber-50/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="click"
                      checked={paymentMethod === 'click'}
                      onChange={() => setPaymentMethod('click')}
                      className="sr-only"
                    />
                    <span className="font-bold text-xs text-amber-950 block">Click</span>
                    <span className="text-[10px] text-stone-500">{t('form.clickSubLabel')}</span>
                  </label>

                  <label
                    className={`cursor-pointer p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                      paymentMethod === 'uzum'
                        ? 'border-amber-800 bg-amber-50/80 ring-2 ring-amber-800/20 shadow-xs'
                        : 'border-amber-900/10 hover:bg-amber-50/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="uzum"
                      checked={paymentMethod === 'uzum'}
                      onChange={() => setPaymentMethod('uzum')}
                      className="sr-only"
                    />
                    <span className="font-bold text-xs text-amber-950 block">Uzum Bank</span>
                    <span className="text-[10px] text-stone-500">{t('form.uzumSubLabel')}</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer"
              >
                {t('form.submit', {
                  price: (selectedTier === 'standard' ? counselor.standardPrice : counselor.premiumPrice).toLocaleString(),
                })}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Simulated Interactive Payment Processing Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-900/10 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowPaymentModal(false)}
              disabled={isProcessingPayment}
              className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-amber-900/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm font-serif">
                {getProviderName()[0]}
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-amber-950">{t('modal.providerSystem', { provider: getProviderName() })}</h3>
                <p className="text-xs text-stone-500">{t('modal.secureGateway')}</p>
              </div>
            </div>

            <div className="my-5 p-4 bg-amber-50/70 rounded-2xl border border-amber-900/10 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>{t('modal.serviceLabel')}</span>
                <span className="font-semibold text-stone-900">{t('modal.serviceValue', { name: counselor.fullName })}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>{t('modal.timeLabel')}</span>
                <span className="font-semibold text-stone-900">{selectedSlot}</span>
              </div>
              <div className="flex justify-between text-amber-950 font-bold text-sm pt-2 border-t border-amber-900/10">
                <span>{t('modal.totalLabel')}</span>
                <span>{(selectedTier === 'standard' ? counselor.standardPrice : counselor.premiumPrice).toLocaleString()} UZS</span>
              </div>
            </div>

            {/* Central Platform Payment Box */}
            <div className="my-4 p-3.5 bg-amber-100/70 border border-amber-300 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-900 block">{t('modal.cardBoxLabel')}</span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-extrabold text-sm text-amber-950">8600 5555 4444 3333</span>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined') {
                      navigator.clipboard.writeText('8600555544443333');
                      setCopiedCard(true);
                      setTimeout(() => setCopiedCard(false), 2000);
                    }
                  }}
                  className="text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                >
                  {copiedCard ? t('modal.copiedButton') : t('modal.copyButton')}
                </button>
              </div>
              <span className="text-[10px] text-stone-600 block">{t('modal.cardOwnerLabel')}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {t('modal.receiptLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('modal.receiptPlaceholder')}
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                />
                <span className="text-[10px] text-stone-500 block mt-1">
                  {t('modal.receiptHint')}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {t('modal.cardNumberLabel')}
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    maxLength={19}
                    placeholder={t('modal.cardNumberPlaceholder')}
                    value={cardNumber}
                    onChange={handleCardChange}
                    className={`w-full pl-9 pr-3 py-2.5 bg-stone-50 border rounded-xl text-xs outline-none transition-all ${
                      cardError ? 'border-red-500 bg-red-50/20' : 'border-stone-300 focus:ring-2 focus:ring-amber-700'
                    }`}
                  />
                </div>
                {cardError && <p className="text-[11px] text-red-600 mt-1">{cardError}</p>}
              </div>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment}
                className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                    <span>{t('modal.processing')}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>{t('modal.confirm')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}