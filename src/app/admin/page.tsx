'use client';

import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BookingTicketData, ForumQuestion, ForumAnswer, SurveyResponse, Counselor } from '@/types';
import { mapCounselorRow } from '@/lib/counselors';
import type { DbTrack } from '@/lib/tracks';
import { mapForumQuestion, mapForumAnswer } from '@/lib/forum';
import { announceStaleBuild, isRunningStaleBuild } from '@/lib/buildVersion';
import { Eye, EyeOff, ShieldCheck, UserCheck, Calendar, Video, Mail, ExternalLink, CheckCircle, XCircle, Clock, Search, RefreshCw, Lock, LogOut, KeyRound, MessageCircleQuestion, Trash2, Link as LinkIcon, Pause, Play, AlertCircle, ClipboardList, Users, MessagesSquare, Flag, Target, Banknote } from 'lucide-react';

interface CounselorApp {
  id?: string;
  full_name: string;
  headline: string;
  // Legacy application rows may still carry these optional fields.
  category?: string;
  specialties?: string;
  bio: string;
  company?: string;
  email: string;
  phone: string;
  telegram: string;
  linkedin?: string;
  proof_link?: string;
  consent_published?: string;
  expected_standard_price: number;
  expected_premium_price: number;
  expected_price_per_question?: number | null;
  expected_soft_cap?: number | null;
  photo_url?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  login_provider: string;
  signup_date: string;
  preferred_language: string | null;
  education_stage: string | null;
  is_under_18: boolean;
  bookings_count: number;
  paid_threads_count: number;
  reviews_count: number;
  last_activity: string | null;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  is_test: boolean;
}

interface UserMetrics {
  total_users: number;
  signups_7d: number;
  signups_30d: number;
  paid_users_count: number;
  repeat_users_count: number;
  paid_conversion_rate: number;
  repeat_rate: number;
}

interface AdminThread {
  id: string;
  booking_id: string;
  counselor_id: string;
  price_per_question: number;
  soft_cap: number | null;
  questions_paid: number;
  questions_used: number;
  total_paid: number;
  total_owed?: number;
  payment_method: 'click' | 'card';
  payment_status: 'pending_payment' | 'paid' | 'closed';
  payment_receipt: string | null;
  bank_reference?: string | null;
  confirmed_amount?: number | null;
  confirmed_by_admin?: string | null;
  admin_confirmed_at?: string | null;
  reply_deadline_at?: string | null;
  reply_status?: 'none' | 'pending_mentor_reply' | 'replied' | 'overdue' | 'refunded' | 'reassigned';
  is_overdue?: boolean;
  created_at: string;
  closed_at: string | null;
  booking: { student_name: string; email: string; telegram: string } | null;
  counselor: { full_name: string; headline: string } | null;
}

interface AdminBookingRow {
  id: string;
  counselor_id: string;
  counselor_name: string;
  counselor_headline: string | null;
  counselor_avatar: string | null;
  tier: BookingTicketData['tier'];
  price: number;
  payment_method: string;
  slot: string;
  student_name: string;
  email: string;
  phone: string;
  telegram: string;
  education: string;
  question: string;
  meet_link: string | null;
  payment_status: BookingTicketData['paymentStatus'];
  payment_receipt: string | null;
  status: BookingTicketData['status'];
  locale: string | null;
  created_at: string;
}

interface SurveyRow {
  id: string;
  age_range?: string;
  status?: string;
  field_of_study?: string;
  interest_area?: string;
  biggest_challenge?: string;
  prior_advice_source?: string;
  interested_in_service: string;
  price_willingness?: string;
  preferred_format?: string;
  contact_info: string;
  willing_to_refer?: boolean;
  created_at?: string;
}

interface WaitlistRow {
  id: string;
  full_name: string;
  contact: string;
  goal: 'job' | 'internship' | 'study_abroad' | 'startup' | 'switch_career';
  field: string;
  experience_level: 'student' | 'entry' | 'mid' | 'senior' | 'founder';
  locale: string;
  status: string;
  created_at: string;
}

interface PlatformMetrics {
  totalUsers: number;
  activeMentees: number;
  totalBookings: number;
  paidGmv: number;
  completedSessions: number;
  repeatRate: number;
  activeMentors: number;
  waitlistCount: number;
}

const EMPTY_METRICS: PlatformMetrics = {
  totalUsers: 0,
  activeMentees: 0,
  totalBookings: 0,
  paidGmv: 0,
  completedSessions: 0,
  repeatRate: 0,
  activeMentors: 0,
  waitlistCount: 0,
};

export default function AdminDashboardPage() {
  const locale = useLocale();
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const dateLocale = t('dateLocale');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const loginInFlight = useRef(false);
  const [loginRetryAt, setLoginRetryAt] = useState(0);
  const [loginRetrySeconds, setLoginRetrySeconds] = useState(0);

  useEffect(() => {
    if (!loginRetryAt) return;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((loginRetryAt - Date.now()) / 1000));
      setLoginRetrySeconds(seconds);
      if (seconds === 0) setLoginRetryAt(0);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [loginRetryAt]);

  const [activeTab, setActiveTab] = useState<'bookings' | 'applications' | 'waitlist' | 'forum' | 'survey' | 'counselors' | 'threads' | 'tracks' | 'users'>('bookings');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userLoading, setUserLoading] = useState(false);
  const [userActionError, setUserActionError] = useState('');
  const [confirmingBlockUser, setConfirmingBlockUser] = useState<AdminUser | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [confirmingDeleteUser, setConfirmingDeleteUser] = useState<AdminUser | null>(null);
  const [isSubmittingUserAction, setIsSubmittingUserAction] = useState(false);
  const [tracks, setTracks] = useState<DbTrack[]>([]);
  const [bookings, setBookings] = useState<BookingTicketData[]>([]);
  const [applications, setApplications] = useState<CounselorApp[]>([]);
  const [forumQuestions, setForumQuestions] = useState<ForumQuestion[]>([]);
  const [forumAnswers, setForumAnswers] = useState<ForumAnswer[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [threads, setThreads] = useState<AdminThread[]>([]);
  const [globalLaunchDate, setGlobalLaunchDate] = useState('2026-11-01');
  const [savingLaunchDate, setSavingLaunchDate] = useState(false);
  const [launchDateSaved, setLaunchDateSaved] = useState(false);

  const handleToggleTrackActive = async (track: DbTrack) => {
    const targetState = !track.is_active;
    try {
      const response = await fetch('/api/admin/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_active', slug: track.slug, is_active: targetState }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      setTracks((prev) =>
        prev.map((item) => (item.slug === track.slug ? { ...item, is_active: targetState } : item))
      );
    } catch (err) {
      console.error('[TOGGLE_TRACK_ERROR]', err);
      alert("Yo'nalish holatini o'zgartirishda xatolik yuz berdi");
    }
  };

  const handleReorderTrack = async (track: DbTrack, direction: 'up' | 'down') => {
    const currentIndex = tracks.findIndex((t) => t.slug === track.slug);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= tracks.length) return;
    const targetTrack = tracks[targetIndex];
    const newOrder = targetTrack.sort_order;
    const oldOrder = track.sort_order;
    try {
      await fetch('/api/admin/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', slug: track.slug, sort_order: newOrder }),
      });
      await fetch('/api/admin/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', slug: targetTrack.slug, sort_order: oldOrder }),
      });
      const next = [...tracks];
      next[currentIndex] = { ...targetTrack, sort_order: oldOrder };
      next[targetIndex] = { ...track, sort_order: newOrder };
      setTracks(next);
    } catch (err) {
      console.error('[REORDER_TRACK_ERROR]', err);
    }
  };

  const handleToggleCounselorActive = async (c: Counselor) => {
    const targetState = !c.isActive;
    try {
      const response = await fetch('/api/admin/counselors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, action: 'toggle_active', is_active: targetState }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      setCounselors((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, isActive: targetState } : item))
      );
    } catch (err) {
      console.error('[ADMIN_TOGGLE_ACTIVE_FAILED]', err);
      alert("Holatni o'zgartirishda xatolik yuz berdi");
    }
  };

  const handleDeleteCounselor = async (c: Counselor) => {
    if (!window.confirm(`${c.fullName} ni platformadan butunlay o'chirmoqchimisiz?`)) return;
    try {
      const response = await fetch('/api/admin/counselors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, action: 'delete' }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      setCounselors((prev) => prev.filter((item) => item.id !== c.id));
    } catch (err) {
      console.error('[ADMIN_DELETE_COUNSELOR_FAILED]', err);
      alert("Mentorni o'chirishda xatolik yuz berdi");
    }
  };

  const handleSaveLaunchDate = async () => {
    setSavingLaunchDate(true);
    setLaunchDateSaved(false);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global_launch_date: new Date(globalLaunchDate).toISOString() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      setLaunchDateSaved(true);
      setTimeout(() => setLaunchDateSaved(false), 3000);
    } catch (err) {
      console.error('[ADMIN_SAVE_LAUNCH_DATE_FAILED]', err);
      alert("Sanani saqlashda xatolik yuz berdi");
    }
    setSavingLaunchDate(false);
  };
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics>(EMPTY_METRICS);
  const [threadActionId, setThreadActionId] = useState<string | null>(null);
  const [threadActionErrors, setThreadActionErrors] = useState<{ [id: string]: string }>({});
  const [activationLinks, setActivationLinks] = useState<Record<string,string>>({});
  const [applicationActionId, setApplicationActionId] = useState<string | null>(null);
  const [applicationActionErrors, setApplicationActionErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Per-booking-id action state -- lets each row show its own in-flight
  // spinner and its own error/warning without one booking's failure
  // clobbering another's.
  const [bookingActionId, setBookingActionId] = useState<string | null>(null);
  const [bookingActionErrors, setBookingActionErrors] = useState<{ [id: string]: string }>({});
  const [bookingActionWarnings, setBookingActionWarnings] = useState<{ [id: string]: string }>({});

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, overviewRes, threadsRes] = await Promise.all([
        fetch('/api/admin/bookings'),
        fetch('/api/admin/overview'),
        fetch('/api/admin/threads'),
      ]);
      const [bookingsData, overviewData, threadsData] = await Promise.all([
        bookingsRes.ok ? await bookingsRes.json().catch(() => null) : null,
        overviewRes.ok ? await overviewRes.json().catch(() => null) : null,
        threadsRes.ok ? await threadsRes.json().catch(() => null) : null,
      ]);
      // bookings check
      // overview check
      // threads check

      setBookings(
        (((bookingsData && bookingsData.bookings) || []) as AdminBookingRow[]).map((b) => ({
            id: b.id,
            counselorId: b.counselor_id,
            counselorName: b.counselor_name,
            counselorHeadline: b.counselor_headline || '',
            counselorAvatar: b.counselor_avatar || '',
            tier: b.tier,
            price: b.price,
            paymentMethod: b.payment_method,
            slot: b.slot,
            studentName: b.student_name,
            email: b.email,
            phone: b.phone,
            telegram: b.telegram,
            education: b.education,
            question: b.question,
            meetLink: b.meet_link || undefined,
            paymentStatus: b.payment_status || 'pending',
            paymentReceipt: b.payment_receipt || '',
            status: b.status || 'confirmed',
            locale: b.locale || 'uz',
            createdAt: b.created_at,
          }))
      );
      setApplications(((overviewData && overviewData.applications) || []) as CounselorApp[]);
      setForumQuestions(((overviewData && overviewData.questions) || []).map(mapForumQuestion));
      setForumAnswers(((overviewData && overviewData.answers) || []).map(mapForumAnswer));
      setSurveyResponses(
        (((overviewData && overviewData.survey) || []) as SurveyRow[]).map((s) => ({
            id: s.id,
            ageRange: s.age_range,
            status: s.status,
            fieldOfStudy: s.field_of_study,
            interestArea: s.interest_area,
            biggestChallenge: s.biggest_challenge,
            priorAdviceSource: s.prior_advice_source,
            interestedInService: s.interested_in_service,
            priceWillingness: s.price_willingness,
            preferredFormat: s.preferred_format,
            contactInfo: s.contact_info,
            willingToRefer: s.willing_to_refer,
            createdAt: s.created_at,
          }))
      );
      setCounselors(((overviewData && overviewData.counselors) || []).map(mapCounselorRow));

      fetch('/api/admin/tracks')
        .then((r) => r.json())
        .then((res) => {
          if (res?.success && Array.isArray(res.tracks)) {
            setTracks(res.tracks);
          }
        })
        .catch((err) => console.warn('[FETCH_ADMIN_TRACKS_ERROR]', err));
      setWaitlist(((overviewData && overviewData.waitlist) || []) as WaitlistRow[]);
      setMetrics({ ...EMPTY_METRICS, ...((overviewData && overviewData.metrics) || {}) });
      setThreads((threadsData && threadsData.threads) || []);
      fetch('/api/admin/settings')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.global_launch_date) {
            setGlobalLaunchDate(d.global_launch_date.split('T')[0]);
          }
        })
        .catch(() => undefined);
    } catch (error) {
      console.warn('[ADMIN_DATA_FETCH_FAILED]', error);
      setBookings([]);
      setApplications([]);
      setForumQuestions([]);
      setForumAnswers([]);
      setSurveyResponses([]);
      setCounselors([]);
      setWaitlist([]);
      setMetrics(EMPTY_METRICS);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  // The real password never reaches this bundle -- every NEXT_PUBLIC_ var is
  // inlined into client JS at build time regardless of how it's referenced,
  // so the check has to happen server-side. /api/admin/check reads a signed,
  // httpOnly session cookie that only /api/admin/login can issue.
  useEffect(() => {
    fetch('/api/admin/check')
      .then((res) => res.json())
      .then(({ authenticated }) => {
        if (authenticated) {
          setIsAuthenticated(true);
          fetchAdminData();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginInFlight.current || loginRetryAt > Date.now()) return;
    const entered = adminPassword.trim();
    if (!entered) return;
    loginInFlight.current = true;
    setIsLoggingIn(true);
    setLoginError('');

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: entered }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.success) {
          setIsAuthenticated(true);
          setLoginError('');
          fetchAdminData();
        } else if (res.status === 429) {
          const reported = Number(res.headers.get('Retry-After') || data?.retryAfterSeconds);
          const seconds = Number.isFinite(reported) && reported > 0 ? Math.ceil(reported) : 900;
          setLoginRetrySeconds(seconds);
          setLoginRetryAt(Date.now() + seconds * 1000);
        } else if (res.status === 500) {
          setLoginError(t('login.checkFailed'));
        } else {
          setLoginError(t('login.wrongPassword'));
        }
      })
      .catch(() => setLoginError(t('login.checkFailed')))
      .finally(() => {
        loginInFlight.current = false;
        setIsLoggingIn(false);
      });
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    Promise.resolve(fetch('/api/admin/logout', { method: 'POST' })).catch((err) =>
      console.warn('Admin logout error:', err)
    );
  };

  const handleApprovePayment = async (booking: BookingTicketData) => {
    const id = booking.id;
    setBookingActionId(id);
    setBookingActionErrors((prev) => ({ ...prev, [id]: '' }));
    setBookingActionWarnings((prev) => ({ ...prev, [id]: '' }));

    // Same reasoning as the booking-submission check: a tab open since
    // before a deploy runs its old JS forever, and old code silently
    // believe a payment was confirmed when it never actually wrote.
    if (await isRunningStaleBuild()) {
      announceStaleBuild();
      setBookingActionId(null);
      setBookingActionErrors((prev) => ({
        ...prev,
        [id]: t('bookings.staleBuildError'),
      }));
      return;
    }

    // The DB write is the actual source of truth here -- awaited on purpose.
    // The UI must not flip to "confirmed" (which also unlocks the real meet
    // link on /my-bookings) unless this genuinely persisted; an admin who
    // believes they confirmed a payment that never actually wrote would have
    // no way to know the student is still locked out.
    try {
      const confirmRes = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_payment', id }),
      });
      const confirmData = await confirmRes.json();

      if (!confirmRes.ok || !confirmData?.success) {
        console.error('[PAYMENT_CONFIRM_FAILED]', id, confirmData);
        setBookingActionId(null);
        setBookingActionErrors((prev) => ({
          ...prev,
          [id]: t('bookings.confirmPaymentFailed'),
        }));
        return;
      }
    } catch (error) {
      console.error('[PAYMENT_CONFIRM_FAILED]', id, error);
      setBookingActionId(null);
      setBookingActionErrors((prev) => ({ ...prev, [id]: t('bookings.confirmPaymentFailed') }));
      return;
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, paymentStatus: 'confirmed' } : b))
    );

    // Tells the student directly -- this is the only place the real meet
    // link is ever sent to them. The DB write above already succeeded, so a
    // failure here is a warning (the confirmation is real, just unnotified),
    // not a hard error -- but the admin must still be told, since there is
    // no other channel that would ever surface this.
    try {
      const emailRes = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'payment_confirmed',
          id: booking.id,
        }),
      });
      const emailData = await emailRes.json();
      if (!emailRes.ok || !emailData?.success) {
        console.error('[PAYMENT_CONFIRMED_EMAIL_FAILED]', id, emailData);
        setBookingActionWarnings((prev) => ({
          ...prev,
          [id]: t('bookings.emailNotSentWarning'),
        }));
      }
    } catch (err) {
      console.error('[PAYMENT_CONFIRMED_EMAIL_FAILED]', id, err);
      setBookingActionWarnings((prev) => ({
        ...prev,
        [id]: t('bookings.emailNotSentWarning'),
      }));
    }

    setBookingActionId(null);
  };

  const handleCompleteBooking = async (id: string) => {
    const errorKey = `complete-${id}`;
    setBookingActionId(id);
    setBookingActionErrors((prev) => ({ ...prev, [errorKey]: '' }));

    try {
      const completeRes = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', id }),
      });
      const completeData = await completeRes.json();

      if (!completeRes.ok || !completeData?.success) {
        console.error('[COMPLETE_BOOKING_FAILED]', id, completeData);
        setBookingActionId(null);
        setBookingActionErrors((prev) => ({
          ...prev,
          [errorKey]: t('bookings.completeBookingFailed'),
        }));
        return;
      }
    } catch (error) {
      console.error('[COMPLETE_BOOKING_FAILED]', id, error);
      setBookingActionId(null);
      setBookingActionErrors((prev) => ({ ...prev, [errorKey]: t('bookings.completeBookingFailed') }));
      return;
    }

    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'completed' } : b)));

    setBookingActionId(null);
  };

  const [confirmModalThread, setConfirmModalThread] = useState<AdminThread | null>(null);
  const [modalBankRef, setModalBankRef] = useState('');
  const [modalAmount, setModalAmount] = useState<number>(0);
  const [modalError, setModalError] = useState('');
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  const openConfirmModal = (th: AdminThread) => {
    setConfirmModalThread(th);
    setModalBankRef('');
    setModalAmount(th.questions_paid ? th.questions_paid * th.price_per_question : th.price_per_question);
    setModalError('');
  };

  const handleConfirmPaymentModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmModalThread) return;
    if (!modalBankRef.trim() || modalBankRef.trim().length < 3) {
      setModalError(locale === 'ru' ? 'Введите референс транзакции (минимум 3 символа)' : locale === 'en' ? 'Enter a valid bank reference (min 3 chars)' : 'Bank referensini kiriting (kamida 3 belgi)');
      return;
    }
    if (!modalAmount || modalAmount <= 0) {
      setModalError(locale === 'ru' ? 'Сумма должна быть больше нуля' : locale === 'en' ? 'Amount must be greater than 0' : 'Summa 0 dan katta bo\'lishi kerak');
      return;
    }
    setIsSubmittingModal(true);
    setModalError('');
    try {
      const res = await fetch('/api/admin/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_payment',
          threadId: confirmModalThread.id,
          bankReference: modalBankRef.trim(),
          confirmedAmount: modalAmount,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setModalError(data.message || data.error || 'Failed');
        setIsSubmittingModal(false);
        return;
      }
      setThreads((prev) =>
        prev.map((th) => (th.id === confirmModalThread.id ? { ...th, ...data.thread, payment_status: 'paid' } : th))
      );
      setConfirmModalThread(null);
    } catch {
      setModalError('Network error');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleRefundThread = async (threadId: string) => {
    if (!window.confirm(locale === 'ru' ? 'Подтвердите возврат средств' : locale === 'en' ? 'Confirm refund' : 'To\'lovni qaytarishni tasdiqlaysizmi?')) return;
    try {
      const res = await fetch('/api/admin/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refund', threadId }),
      });
      const data = await res.json();
      if (data.success) {
        setThreads((prev) =>
          prev.map((th) => (th.id === threadId ? { ...th, payment_status: 'closed', reply_status: 'refunded' } : th))
        );
      }
    } catch (err) {
      console.error('[REFUND_FAILED]', err);
    }
  };

  const handleReassignThread = async (threadId: string) => {
    const newCounselorId = window.prompt(
      locale === 'ru' ? 'Введите ID нового ментора:' : locale === 'en' ? 'Enter new mentor ID:' : 'Yangi mentor ID sini kiriting:'
    );
    if (!newCounselorId || !newCounselorId.trim()) return;
    try {
      const res = await fetch('/api/admin/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reassign', threadId, newCounselorId: newCounselorId.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setThreads((prev) =>
          prev.map((th) => (th.id === threadId ? { ...th, counselor_id: newCounselorId.trim(), reply_status: 'reassigned', is_overdue: false } : th))
        );
      }
    } catch (err) {
      console.error('[REASSIGN_FAILED]', err);
    }
  };

  // Approval returns a local, single-use mentor activation link.
  const fetchAdminUsers = async (page = 1, search = '') => {
    setUserLoading(true);
    setUserActionError('');
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setAdminUsers(data.users || []);
        setUserMetrics(data.metrics || null);
        setUserPage(data.pagination?.page || 1);
        setUserTotalPages(data.pagination?.totalPages || 1);
      } else {
        setUserActionError(data.error || 'Failed to load users');
      }
    } catch {
      setUserActionError('Network error loading users');
    } finally {
      setUserLoading(false);
    }
  };

  const handleBlockUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingBlockUser) return;
    setIsSubmittingUserAction(true);
    setUserActionError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'block',
          userId: confirmingBlockUser.id,
          reason: blockReasonInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminUsers((prev) =>
          prev.map((u) => (u.id === confirmingBlockUser.id ? { ...u, is_blocked: true, blocked_at: new Date().toISOString(), blocked_reason: blockReasonInput.trim() } : u))
        );
        setConfirmingBlockUser(null);
        setBlockReasonInput('');
      } else {
        setUserActionError(data.message || data.error);
      }
    } catch {
      setUserActionError('Network error');
    } finally {
      setIsSubmittingUserAction(false);
    }
  };

  const handleUnblockUser = async (user: AdminUser) => {
    if (!window.confirm(`${user.name || user.email} blokdan chiqarilsinmi?`)) return;
    setIsSubmittingUserAction(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unblock', userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_blocked: false, blocked_at: null, blocked_reason: null } : u))
        );
      } else {
        alert(data.message || data.error);
      }
    } catch {
      alert('Network error');
    } finally {
      setIsSubmittingUserAction(false);
    }
  };

  const handleDeleteUserSubmit = async () => {
    if (!confirmingDeleteUser) return;
    setIsSubmittingUserAction(true);
    setUserActionError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', userId: confirmingDeleteUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminUsers((prev) => prev.filter((u) => u.id !== confirmingDeleteUser.id));
        setConfirmingDeleteUser(null);
        if (userMetrics) {
          setUserMetrics({
            ...userMetrics,
            total_users: Math.max(0, userMetrics.total_users - 1),
          });
        }
      } else {
        setUserActionError(data.message || data.error);
      }
    } catch {
      setUserActionError('Network error');
    } finally {
      setIsSubmittingUserAction(false);
    }
  };

  const handleToggleTestUser = async (user: AdminUser) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_test', userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_test: data.is_test } : u))
        );
      }
    } catch (err) {
      console.error('[TOGGLE_TEST_FAILED]', err);
    }
  };

  const handleMentorAccess = async (counselor: Counselor) => {
    const email = window.prompt(locale === 'ru' ? 'Email ментора:' : locale === 'en' ? 'Mentor email:' : 'Mentorning email manzili:');
    if (!email) return;
    try {
      const response = await fetch('/api/admin/mentor-access', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:counselor.id,email})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'update_failed');
      setActivationLinks(current=>({...current,[counselor.id]:result.activationUrl}));
      setApplicationActionErrors(current=>({...current,[counselor.id]:''}));
    } catch {setApplicationActionErrors(current=>({...current,[counselor.id]:t('applications.approveFailed')}));}
  };

  const handleApproveApplication = async (app: CounselorApp) => {
    const appKey = app.id || app.email;
    if (!app.id) return;
    setApplicationActionId(appKey);
    setApplicationActionErrors((prev) => ({ ...prev, [appKey]: '' }));

    try {
      const res = await fetch('/api/admin/approve-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id }),
      });
      const data = await res.json();

      if (!data.success) {
        console.error('[APPLICATION_APPROVE_FAILED]', appKey, data.error, data.message);
        setApplicationActionErrors((prev) => ({
          ...prev,
          [appKey]:
            data.error === 'email_already_registered'
              ? t('applications.approveFailedEmailRegistered')
              : t('applications.approveFailed'),
        }));
        setApplicationActionId(null);
        return;
      }

      if(data.activationUrl) setActivationLinks(prev=>({...prev,[appKey]:data.activationUrl}));
      setApplications((prev) =>
        prev.map((a) => ((a.id || a.email) === appKey ? { ...a, status: 'approved' } : a))
      );
    } catch (err) {
      console.error('[APPLICATION_APPROVE_FAILED]', appKey, err);
      setApplicationActionErrors((prev) => ({ ...prev, [appKey]: t('applications.approveFailed') }));
    } finally {
      setApplicationActionId(null);
    }
  };

  const handleRejectApplication = async (app: CounselorApp) => {
    const appKey = app.id || app.email;
    if (!app.id) return;
    setApplicationActionId(appKey);
    setApplicationActionErrors((prev) => ({ ...prev, [appKey]: '' }));
    try {
      const response = await fetch('/api/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', id: app.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'reject_failed');
      setApplications((prev) =>
        prev.map((a) => ((a.id || a.email) === appKey ? { ...a, status: 'rejected' } : a))
      );
    } catch (error) {
      console.error('[APPLICATION_REJECT_FAILED]', appKey, error);
      setApplicationActionErrors((prev) => ({ ...prev, [appKey]: t('applications.approveFailed') }));
    } finally {
      setApplicationActionId(null);
    }
  };

  const handleDeleteApplication = async (app: CounselorApp) => {
    const confirmed = window.confirm(t('applications.deleteConfirm', { name: app.full_name }));
    if (!confirmed || !app.id) return;

    const appKey = app.id || app.email;
    setApplicationActionId(appKey);
    setApplicationActionErrors((prev) => ({ ...prev, [appKey]: '' }));
    try {
      const response = await fetch('/api/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: app.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'delete_failed');
      setApplications((prev) => prev.filter((a) => (a.id || a.email) !== appKey));
    } catch (error) {
      console.error('[APPLICATION_DELETE_FAILED]', appKey, error);
      setApplicationActionErrors((prev) => ({ ...prev, [appKey]: t('applications.approveFailed') }));
    } finally {
      setApplicationActionId(null);
    }
  };

  const filteredBookings = bookings.filter(
    (b) =>
      b.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.counselorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If NOT Authenticated: Render Secure Login Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased flex flex-col justify-between">
        <Navbar />

        <main className="max-w-md mx-auto px-4 py-16 w-full">
          <div className="bg-white rounded-3xl border border-amber-900/15 p-8 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-8 h-8 text-amber-300" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                {t('login.badge')}
              </span>
              <h1 className="font-serif font-extrabold text-2xl text-amber-950 mt-3">
                {t('login.title')}
              </h1>
              <p className="text-xs text-stone-600 mt-1">
                {t('login.subtitle')}
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {t('login.passwordLabel')}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {(loginError || loginRetrySeconds > 0) && (
                  <p role="alert" className="text-[11px] text-red-600 font-semibold mt-1.5">
                    {loginRetrySeconds > 0 ? t('login.rateLimited', { seconds: loginRetrySeconds }) : loginError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || loginRetrySeconds > 0 || !adminPassword.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Lock className="w-4 h-4 text-amber-300" />
                <span>{isLoggingIn ? t('login.checking') : t('login.submit')}</span>
              </button>
            </form>

            <p className="text-[10px] text-stone-400 pt-2 border-t border-amber-900/10">
              {t('login.legalNotice')}
            </p>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Title & Logout */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/10 border border-amber-900/15 text-amber-950 text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-amber-800" />
              <span>{t('header.badge')}</span>
            </div>
            <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-amber-950">
              {t('header.title')}
            </h1>
            <p className="text-xs text-stone-600 mt-1">
              {t('header.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminData}
              className="inline-flex items-center gap-2 bg-amber-900 text-amber-50 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-amber-800 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('header.refresh')}</span>
            </button>

            <button
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('header.logout')}</span>
            </button>
          </div>
        </div>

        <section aria-label={t('metrics.heading')} className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard icon={<Users className="h-4 w-4" />} label={t('metrics.users')} value={metrics.totalUsers.toLocaleString()} detail={t('metrics.activeMentees', { count: metrics.activeMentees })} />
          <MetricCard icon={<Calendar className="h-4 w-4" />} label={t('metrics.bookings')} value={metrics.totalBookings.toLocaleString()} detail={t('metrics.completed', { count: metrics.completedSessions })} />
          <MetricCard icon={<Banknote className="h-4 w-4" />} label={t('metrics.gmv')} value={`${metrics.paidGmv.toLocaleString()} UZS`} detail={t('metrics.repeatRate', { rate: metrics.repeatRate })} />
          <MetricCard icon={<Target className="h-4 w-4" />} label={t('metrics.demand')} value={metrics.waitlistCount.toLocaleString()} detail={t('metrics.mentors', { count: metrics.activeMentors })} />
        </section>

        {/* Master Plan Section 3: Phase 1 Launch Success Criteria KPI Tracker */}
        <section className="mb-7 rounded-3xl bg-[#0F1E36] text-white p-5 sm:p-6 border border-[#F59E0B]/30 shadow-lg neo-silk-tessellation-dark">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#F59E0B]">
                FOUNDER MASTER PLAN • PHASE 1 LAUNCH TARGETS (MONTHS 1–2)
              </span>
              <h2 className="font-display font-bold text-lg text-white mt-0.5">
                50 Verified Mentors • 300 Active Users • 100 Mentorship Sessions • 15% Commission GMV
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="rounded-xl bg-white/[0.07] border border-white/10 px-3 py-2">
                <div className="text-[10px] text-slate-300">MENTORS GOAL</div>
                <div className="font-bold text-[#F59E0B]">
                  {Math.max(metrics.activeMentors, counselors.length)} / 50
                </div>
              </div>
              <div className="rounded-xl bg-white/[0.07] border border-white/10 px-3 py-2">
                <div className="text-[10px] text-slate-300">USERS GOAL</div>
                <div className="font-bold text-white">
                  {Math.max(metrics.totalUsers, waitlist.length)} / 300
                </div>
              </div>
              <div className="rounded-xl bg-white/[0.07] border border-white/10 px-3 py-2">
                <div className="text-[10px] text-slate-300">SESSIONS GOAL</div>
                <div className="font-bold text-white">{metrics.totalBookings} / 100</div>
              </div>
              <div className="rounded-xl bg-white/[0.07] border border-white/10 px-3 py-2">
                <div className="text-[10px] text-slate-300">NET REVENUE (15%)</div>
                <div className="font-bold text-emerald-300">
                  {Math.round(metrics.paidGmv * 0.15).toLocaleString()} UZS
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Admin Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-3 mb-6 border-b border-amber-900/15 pb-3">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'bookings'
                ? 'bg-amber-900 text-amber-50 shadow-sm'
                : 'bg-amber-50/70 text-stone-700 hover:bg-amber-100/60 border border-amber-900/10'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{t('tabs.bookings', { count: bookings.length })}</span>
          </button>

          <button
            onClick={() => setActiveTab('waitlist')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'waitlist'
                ? 'bg-amber-900 text-amber-50 shadow-sm'
                : 'bg-amber-50/70 text-stone-700 hover:bg-amber-100/60 border border-amber-900/10'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>{t('tabs.waitlist', { count: waitlist.length })}</span>
          </button>

          <button
            onClick={() => setActiveTab('applications')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'applications'
                ? 'bg-amber-900 text-amber-50 shadow-sm'
                : 'bg-amber-50/70 text-stone-700 hover:bg-amber-100/60 border border-amber-900/10'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{t('tabs.applications', { count: applications.length })}</span>
          </button>

          <button
            onClick={() => setActiveTab('forum')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'forum'
                ? 'bg-amber-900 text-amber-50 shadow-sm'
                : 'bg-amber-50/70 text-stone-700 hover:bg-amber-100/60 border border-amber-900/10'
            }`}
          >
            <MessageCircleQuestion className="w-4 h-4" />
            <span>{t('tabs.forum', { count: forumQuestions.length })}</span>
          </button>

          <button
            onClick={() => setActiveTab('survey')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'survey'
                ? 'bg-amber-900 text-amber-50 shadow-sm'
                : 'bg-amber-50/70 text-stone-700 hover:bg-amber-100/60 border border-amber-900/10'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>{t('tabs.survey', { count: surveyResponses.length })}</span>
          </button>

          <button
            onClick={() => setActiveTab('counselors')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'counselors'
                ? 'bg-amber-900 text-amber-50 shadow-sm'
                : 'bg-amber-50/70 text-stone-700 hover:bg-amber-100/60 border border-amber-900/10'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('tabs.counselors', { count: counselors.length })}</span>
          </button>

          <button
            onClick={() => setActiveTab('tracks')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'tracks'
                ? 'bg-amber-900 text-amber-50 shadow-sm'
                : 'bg-amber-50/70 text-stone-700 hover:bg-amber-100/60 border border-amber-900/10'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Yo&apos;nalishlar ({tracks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('threads')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'threads'
                ? 'bg-amber-900 text-amber-50 shadow-sm'
                : 'bg-amber-50/70 text-stone-700 hover:bg-amber-100/60 border border-amber-900/10'
            }`}
          >
            <MessagesSquare className="w-4 h-4" />
            <span>{t('threads.tabLabel', { count: threads.length })}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('users');
              void fetchAdminUsers(userPage, userSearch);
            }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-amber-900 text-amber-50 shadow-sm'
                : 'bg-amber-50/70 text-stone-700 hover:bg-amber-100/60 border border-amber-900/10'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{t('users.tabLabel', { count: userMetrics?.total_users ?? adminUsers.length })}</span>
          </button>
        </div>

        {/* Tab 8: Tracks Management */}
        {activeTab === 'tracks' && (
          <div className="space-y-6">
            <div className="bg-white/95 rounded-3xl border border-amber-900/15 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-900/10">
                <div>
                  <h3 className="font-serif font-bold text-lg text-amber-950 flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-800" />
                    <span>Yo&apos;nalishlar tizimi (Tracks System)</span>
                  </h3>
                  <p className="text-xs text-stone-600 mt-1">
                    9 ta start yo&apos;nalishi (faol) va Phase 2 yo&apos;nalishlari (nofaol). Har bir yo&apos;nalishning faollik holati va tartibini boshqaring.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                    Faol: {tracks.filter((t) => t.is_active).length}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-300 font-bold">
                    Nofaol: {tracks.filter((t) => !t.is_active).length}
                  </span>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-50/80 border-b border-amber-900/10 text-amber-950 font-serif font-bold">
                      <th className="p-3 w-20 text-center">Tartib</th>
                      <th className="p-3">Belgi & Slug</th>
                      <th className="p-3">O&apos;zbekcha nomi</th>
                      <th className="p-3">Inglizcha / Ruscha</th>
                      <th className="p-3">Tavsif (UZ)</th>
                      <th className="p-3 text-center">Mentorlar</th>
                      <th className="p-3 text-center">Holat</th>
                      <th className="p-3 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-900/10">
                    {tracks.map((track, idx) => (
                      <tr key={track.slug} className="hover:bg-amber-50/40 transition-colors">
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1 font-mono font-bold text-stone-700">
                            <span>#{track.sort_order}</span>
                            <div className="flex flex-col ml-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleReorderTrack(track, 'up')}
                                className="text-[10px] text-stone-400 hover:text-amber-800 disabled:opacity-20 cursor-pointer"
                                title="Yuqoriga"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={idx === tracks.length - 1}
                                onClick={() => handleReorderTrack(track, 'down')}
                                className="text-[10px] text-stone-400 hover:text-amber-800 disabled:opacity-20 cursor-pointer"
                                title="Pastga"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl p-1 bg-amber-50 rounded-lg border border-amber-900/10">{track.icon}</span>
                            <div>
                              <code className="text-[11px] font-mono text-amber-900 font-semibold bg-amber-100/60 px-1.5 py-0.5 rounded">
                                {track.slug}
                              </code>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-stone-900">
                          {track.name_uz}
                        </td>
                        <td className="p-3 text-stone-600">
                          <div>{track.name_en}</div>
                          {track.name_ru && <div className="text-[10px] text-stone-400">{track.name_ru}</div>}
                        </td>
                        <td className="p-3 text-stone-600 max-w-xs truncate" title={track.short_description_uz || ''}>
                          {track.short_description_uz || '-'}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                            (track.mentor_count || 0) > 0
                              ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                              : 'bg-stone-100 text-stone-500'
                          }`}>
                            {track.mentor_count || 0} ta
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                            track.is_active
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-stone-100 text-stone-500 border border-stone-200'
                          }`}>
                            {track.is_active ? 'Faol' : 'Nofaol'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleTrackActive(track)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              track.is_active
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                : 'bg-emerald-700 hover:bg-emerald-800 text-emerald-50 shadow-2xs'
                            }`}
                          >
                            {track.is_active ? "Yashirish" : "Faollashtirish"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Bookings Management */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {/* Search Filter */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder={t('bookings.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-amber-900/15 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
              />
            </div>

            {filteredBookings.length === 0 ? (
              <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
                <Calendar className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-base text-amber-950">{t('bookings.emptyTitle')}</h4>
                <p className="text-xs text-stone-500 mt-1">{t('bookings.emptyBody')}</p>
              </div>
            ) : (
              <div className="bg-white/95 rounded-3xl border border-amber-900/15 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-amber-50/80 border-b border-amber-900/10 text-amber-950 font-serif font-bold">
                        <th className="p-4">{t('bookings.colTicketId')}</th>
                        <th className="p-4">{t('bookings.colStudent')}</th>
                        <th className="p-4">{t('bookings.colCounselor')}</th>
                        <th className="p-4">{t('bookings.colTimePackage')}</th>
                        <th className="p-4">{t('bookings.colPaymentStatus')}</th>
                        <th className="p-4">{t('bookings.colSessionStatus')}</th>
                        <th className="p-4">{t('bookings.colVideoRoom')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-900/10">
                      {filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="p-4 font-mono font-bold text-amber-900">{b.id}</td>
                          <td className="p-4">
                            <div className="font-bold text-stone-900">{b.studentName}</div>
                            <div className="text-[11px] text-stone-500">{b.email} • {b.phone}</div>
                            <div className="text-[10px] text-amber-800 font-semibold">{b.telegram}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-amber-950">{b.counselorName}</div>
                            <div className="text-[10px] text-stone-500 line-clamp-1">{b.counselorHeadline}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-stone-900">{b.slot}</div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300/50">
                              {(b.tier === 'standard' || b.tier === 'premium' ? tCommon(b.tier) : b.tier).toUpperCase()} ({b.price.toLocaleString()} UZS)
                            </span>
                          </td>
                          <td className="p-4">
                            {b.paymentStatus === 'confirmed' ? (
                              <div className="space-y-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  <CheckCircle className="w-3 h-3 text-emerald-700" />
                                  <span>{t('bookings.paymentConfirmedBadge', { method: b.paymentMethod })}</span>
                                </span>
                                {bookingActionWarnings[b.id] && (
                                  <div className="flex items-start gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1.5 max-w-[220px]">
                                    <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                    <span>{bookingActionWarnings[b.id]}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                                  <span>{t('bookings.paymentPendingBadge')}</span>
                                </span>
                                {b.paymentReceipt && (
                                  <div className="text-[10px] font-mono text-stone-600">
                                    {t('bookings.receiptIdLabel')} <span className="font-bold text-amber-950">{b.paymentReceipt}</span>
                                  </div>
                                )}
                                {bookingActionErrors[b.id] && (
                                  <div className="flex items-start gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-300 rounded-lg px-2 py-1.5 max-w-[220px]">
                                    <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                    <span>{bookingActionErrors[b.id]}</span>
                                  </div>
                                )}
                                {b.paymentMethod !== 'click' && (
                                  <button
                                    type="button"
                                    onClick={() => handleApprovePayment(b)}
                                    disabled={bookingActionId === b.id}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-emerald-50 text-[10px] font-bold transition-all shadow-2xs cursor-pointer block disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {bookingActionId === b.id ? t('bookings.approving') : t('bookings.approvePayment')}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {b.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700 border border-stone-300">
                                <CheckCircle className="w-3 h-3" /> {t('bookings.sessionCompletedBadge')}
                              </span>
                            ) : (
                              <div className="space-y-1.5">
                                {bookingActionErrors[`complete-${b.id}`] && (
                                  <div className="flex items-start gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-300 rounded-lg px-2 py-1.5 max-w-[220px]">
                                    <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                    <span>{bookingActionErrors[`complete-${b.id}`]}</span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleCompleteBooking(b.id)}
                                  disabled={bookingActionId === b.id}
                                  className="px-2.5 py-1 rounded-lg bg-stone-700 hover:bg-stone-800 text-stone-50 text-[10px] font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {bookingActionId === b.id ? '...' : t('bookings.completeButton')}
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <a
                              href={b.meetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>{t('bookings.joinRoom')}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal for admin manual payment confirmation */}
            {confirmModalThread && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-amber-900/15">
                  <div className="flex items-center justify-between border-b border-amber-900/10 pb-3">
                    <h3 className="font-serif font-bold text-base text-amber-950 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
                      {t('threads.confirmPaymentModalTitle')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setConfirmModalThread(null)}
                      className="text-stone-400 hover:text-stone-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-900/10 text-xs space-y-1">
                    <div><strong>Talaba:</strong> {confirmModalThread.booking?.student_name} ({confirmModalThread.booking?.email})</div>
                    <div><strong>Rahnamo:</strong> {confirmModalThread.counselor?.full_name}</div>
                    <div><strong>Savollar soni:</strong> {confirmModalThread.questions_paid || confirmModalThread.soft_cap || 1} ta</div>
                    {confirmModalThread.payment_receipt && (
                      <div className="pt-1 text-stone-600">
                        <strong>Yuborilgan chek:</strong> <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">{confirmModalThread.payment_receipt}</span>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleConfirmPaymentModalSubmit} className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">
                        {t('threads.bankReferenceLabel')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={modalBankRef}
                        onChange={(e) => setModalBankRef(e.target.value)}
                        placeholder="TRX-123456789 yoki chek raqami"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:bg-white focus:border-amber-700"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-800 block mb-1">
                        {t('threads.confirmedAmountLabel')} *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={modalAmount || ''}
                        onChange={(e) => setModalAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:bg-white focus:border-amber-700 font-mono"
                      />
                    </div>

                    {modalError && (
                      <p className="text-red-700 font-medium bg-red-50 border border-red-200 rounded-lg p-2">
                        {modalError}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setConfirmModalThread(null)}
                        className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold cursor-pointer"
                      >
                        {t('threads.cancelButton')}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingModal}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingModal ? '...' : t('threads.saveButton')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Counselor Applications */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            {applications.length === 0 ? (
              <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
                <UserCheck className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-base text-amber-950">{t('applications.emptyTitle')}</h4>
                <p className="text-xs text-stone-500 mt-1">{t('applications.emptyBody')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {applications.map((app, idx) => (
                  <div key={app.id || idx} className="bg-white/95 rounded-3xl border border-amber-900/15 p-6 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-amber-900/10 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          {app.category || app.specialties || t('applications.generalCategoryFallback')}
                        </span>
                        <h3 className="font-serif font-bold text-base text-amber-950">{app.full_name}</h3>
                        <p className="text-xs text-stone-600">{app.headline}{app.company ? ` (${app.company})` : ''}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          app.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : app.status === 'rejected'
                            ? 'bg-red-100 text-red-900 border border-red-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {app.status === 'approved'
                            ? t('applications.statusApproved')
                            : app.status === 'rejected'
                            ? t('applications.statusRejected')
                            : t('applications.statusPending')}
                        </span>
                        <button
                          onClick={() => handleDeleteApplication(app)}
                          title={t('applications.deleteButtonTitle')}
                          className="p-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-900/10">
                      &ldquo;{app.bio}&rdquo;
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 font-mono">
                      <div>📧 {app.email}</div>
                      <div>📞 {app.phone}</div>
                      <div>💬 {app.telegram}</div>
                      <div>
                        {(app.proof_link || app.linkedin) ? (
                          <a
                            href={app.proof_link || app.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-800 underline font-semibold inline-flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>Tasdiqlovchi havola (Proof)</span>
                          </a>
                        ) : (
                          <span className="text-stone-400">Tasdiqlovchi havola yo&apos;q</span>
                        )}
                      </div>
                    </div>
                    {app.consent_published && (
                      <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium">
                        ✓ Platformada e&apos;lon qilinishiga rozilik berilgan: {new Date(app.consent_published).toLocaleString()}
                      </div>
                    )}

                    <div className="pt-3 border-t border-amber-900/10 flex flex-wrap gap-3 items-center justify-between">
                      <div className="text-xs font-serif">
                        <span className="text-stone-400 block text-[10px]">{t('applications.expectedPriceLabel')}</span>
                        <span className="font-bold text-amber-950">{app.expected_standard_price?.toLocaleString()} UZS</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRejectApplication(app)}
                          disabled={app.status === 'approved' || app.status === 'rejected'}
                          className="px-3.5 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {t('applications.reject')}
                        </button>
                        <button
                          onClick={() => handleApproveApplication(app)}
                          disabled={
                            app.status === 'approved' ||
                            app.status === 'rejected' ||
                            applicationActionId === (app.id || app.email)
                          }
                          className="px-3.5 py-1.5 rounded-xl bg-amber-900 text-amber-50 text-xs font-bold hover:bg-amber-800 transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {applicationActionId === (app.id || app.email)
                            ? t('applications.approving')
                            : t('applications.approve')}
                        </button>
                      </div>
                      {activationLinks[app.id || app.email] && (
                        <div className="w-full mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
                          <p>{locale === 'ru' ? 'Передайте ментору ссылку для входа (48 часов):' : locale === 'en' ? 'Share this activation link with the mentor (48 hours):' : 'Mentorga ushbu kirish havolasini yuboring (48 soat):'}</p>
                          <input aria-label="Mentor activation link" readOnly value={activationLinks[app.id || app.email]} onFocus={e=>e.currentTarget.select()} className="mt-2 w-full rounded border bg-white p-2" />
                        </div>
                      )}
                      {applicationActionErrors[app.id || app.email] && (
                        <p className="text-[11px] text-red-600 font-semibold mt-1.5 text-right">
                          {applicationActionErrors[app.id || app.email]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Forum Moderation (read-only for this pass) */}
        {activeTab === 'forum' && (
          <div className="space-y-6">
            {forumQuestions.length === 0 ? (
              <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
                <MessageCircleQuestion className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-base text-amber-950">{t('forum.emptyTitle')}</h4>
                <p className="text-xs text-stone-500 mt-1">{t('forum.emptyBody')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...forumQuestions]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((q) => {
                    const qAnswers = forumAnswers.filter((a) => a.questionId === q.id);
                    return (
                      <div key={q.id} className="bg-white/95 rounded-3xl border border-amber-900/15 p-6 shadow-sm space-y-3">
                        <div className="flex items-start justify-between gap-3 border-b border-amber-900/10 pb-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{q.category}</span>
                            <h3 className="font-serif font-bold text-base text-amber-950">{q.title}</h3>
                            <p className="text-xs text-stone-600 mt-1">{q.body}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                            {t('forum.answersCountSuffix', { count: qAnswers.length })}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 font-mono">
                          <div>👤 {q.studentNameOrAnonymous}</div>
                          <div className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-stone-400" /> {q.email}
                          </div>
                        </div>

                        {qAnswers.length > 0 && (
                          <div className="pt-2 space-y-2">
                            {qAnswers.map((a) => {
                              const responder = counselors.find((c) => c.id === a.counselorId);
                              return (
                                <div key={a.id} className="bg-amber-50/60 border border-amber-900/10 rounded-xl p-3 text-xs">
                                  <span className="font-bold text-amber-950">{responder?.fullName || a.counselorId}: </span>
                                  <span className="text-stone-700">{a.body}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'waitlist' && (
          <div className="space-y-6">
            {waitlist.length === 0 ? (
              <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
                <Target className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-base text-amber-950">{t('waitlist.emptyTitle')}</h4>
                <p className="text-xs text-stone-500 mt-1">{t('waitlist.emptyBody')}</p>
              </div>
            ) : (
              <div className="bg-white/95 rounded-3xl border border-amber-900/15 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead><tr className="bg-amber-50/80 border-b border-amber-900/10 text-amber-950 font-serif font-bold">
                      <th className="p-4">{t('waitlist.person')}</th>
                      <th className="p-4">{t('waitlist.goal')}</th>
                      <th className="p-4">{t('waitlist.field')}</th>
                      <th className="p-4">{t('waitlist.level')}</th>
                      <th className="p-4">{t('waitlist.date')}</th>
                    </tr></thead>
                    <tbody className="divide-y divide-amber-900/10">
                      {waitlist.map((entry) => (
                        <tr key={entry.id} className="hover:bg-amber-50/30">
                          <td className="p-4"><div className="font-bold text-stone-900">{entry.full_name}</div><div className="text-[11px] text-amber-800">{entry.contact}</div></td>
                          <td className="p-4"><span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">{t(`waitlist.goals.${entry.goal}`)}</span></td>
                          <td className="p-4 font-semibold text-stone-700">{entry.field}</td>
                          <td className="p-4 text-stone-600">{t(`waitlist.levels.${entry.experience_level}`)}</td>
                          <td className="p-4 text-stone-500">{new Date(entry.created_at).toLocaleDateString(dateLocale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Survey Responses -- read-only lead list, no actions */}
        {activeTab === 'survey' && (
          <div className="space-y-6">
            {surveyResponses.length === 0 ? (
              <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
                <ClipboardList className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-base text-amber-950">{t('survey.emptyTitle')}</h4>
                <p className="text-xs text-stone-500 mt-1">{t('survey.emptyBody')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {surveyResponses.map((s) => (
                  <div key={s.id} className="bg-white/95 rounded-3xl border border-amber-900/15 p-6 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-amber-900/10 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          {s.status || t('survey.statusFallback')} {s.ageRange ? `• ${s.ageRange}` : ''}
                        </span>
                        <h3 className="font-serif font-bold text-base text-amber-950">{s.contactInfo}</h3>
                        {s.fieldOfStudy && <p className="text-xs text-stone-600">{s.fieldOfStudy}</p>}
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0 ${
                          s.interestedInService === 'Yes definitely'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : s.interestedInService === 'Maybe'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-stone-100 text-stone-600 border border-stone-300'
                        }`}
                      >
                        {s.interestedInService.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
                      <div>
                        <span className="text-stone-400 block text-[10px]">{t('survey.interestAreaLabel')}</span>
                        {s.interestArea || '—'}
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">{t('survey.adviceSourceLabel')}</span>
                        {s.priorAdviceSource || '—'}
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">{t('survey.priceWillingnessLabel')}</span>
                        {s.priceWillingness || '—'}
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">{t('survey.formatLabel')}</span>
                        {s.preferredFormat || '—'}
                      </div>
                    </div>

                    {s.biggestChallenge && (
                      <p className="text-xs text-stone-700 leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-900/10">
                        &quot;{s.biggestChallenge}&quot;
                      </p>
                    )}

                    <div className="pt-3 border-t border-amber-900/10 flex flex-wrap gap-3 items-center justify-between text-[11px] text-stone-500">
                      <span>{s.willingToRefer ? t('survey.willingToReferYes') : t('survey.willingToReferNo')}</span>
                      <span>{s.createdAt ? new Date(s.createdAt).toLocaleDateString(dateLocale) : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Live counselor roster -- read-only, no actions. Mainly for
            the commission-window badge so payouts don't require calculating
            joined_at + 3 months by hand each time. */}
        {activeTab === 'counselors' && (
          <div className="space-y-6">
            {counselors.length === 0 ? (
              <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
                <Users className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-base text-amber-950">{t('counselors.emptyTitle')}</h4>
                <p className="text-xs text-stone-500 mt-1">{t('counselors.emptyBody')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {counselors.map((c) => {
                  const freeUntil = c.commissionFreeUntil ? new Date(c.commissionFreeUntil) : null;
                  const isCommissionFree = freeUntil ? new Date() < freeUntil : false;
                  return (
                    <div key={c.id} className="bg-white/95 rounded-3xl border border-amber-900/15 p-6 shadow-sm space-y-4">
                      <div className="flex items-start justify-between gap-3 border-b border-amber-900/10 pb-3">
                        <div>
                          <h3 className="font-serif font-bold text-base text-amber-950">{c.fullName}</h3>
                          <p className="text-xs text-stone-600">{c.headline}</p>
                          {c.company && <p className="text-[11px] text-stone-400">{c.company}</p>}
                        </div>
                        {freeUntil && (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0 whitespace-nowrap ${
                              isCommissionFree
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {isCommissionFree
                              ? t('counselors.commissionFreeLabel', { date: freeUntil.toLocaleDateString(dateLocale) })
                              : t('counselors.commissionStartedLabel')}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
                        <div>
                          <span className="text-stone-400 block text-[10px]">{t('counselors.standardPriceLabel')}</span>
                          {c.standardPrice.toLocaleString()} UZS
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[10px]">{t('counselors.premiumPriceLabel')}</span>
                          {c.premiumPrice.toLocaleString()} UZS
                        </div>
                      </div>

                      <div className="pt-3 border-t border-amber-900/10 flex flex-wrap gap-3 items-center justify-between text-[11px] text-stone-500">
                        <span>{t('counselors.ratingLabel', { rating: c.rating, count: c.reviewsCount })}</span>
                        <span>{c.joinedAt ? t('counselors.joinedLabel', { date: new Date(c.joinedAt).toLocaleDateString(dateLocale) }) : ''}</span>
                      </div>

                      {/* Phase 4: Pause/Activate and Remove Controls */}
                      <div className="pt-3 border-t border-amber-900/10 flex flex-wrap gap-3 items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            c.isActive !== false
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-zinc-100 text-zinc-700 border border-zinc-300'
                          }`}
                        >
                          {c.isActive !== false ? '● Faol' : '⏸ Pauza qilingan'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button type="button" onClick={()=>handleMentorAccess(c)} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-300 bg-amber-50">
                            {locale === 'ru' ? 'Ссылка для входа' : locale === 'en' ? 'Activation link' : 'Kirish havolasi'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleCounselorActive(c)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                              c.isActive !== false
                                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                            }`}
                          >
                            {c.isActive !== false ? 'Pauza qilish' : 'Faollashtirish'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCounselor(c)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                          >
                            O&apos;chirish
                          </button>
                        </div>
                        {activationLinks[c.id] && <input aria-label="Mentor activation link" readOnly value={activationLinks[c.id]} onFocus={e=>e.currentTarget.select()} className="w-full mt-2 border rounded p-2 text-xs" />}
                        {applicationActionErrors[c.id] && <p className="text-xs text-red-600">{applicationActionErrors[c.id]}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Text Q&A changes use the authenticated admin API. */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Overview Metric Cards */}
            {userMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  icon={<Users className="w-4 h-4" />}
                  label={t('users.metricTotal')}
                  value={userMetrics.total_users.toLocaleString()}
                  detail={`7k: +${userMetrics.signups_7d} | 30k: +${userMetrics.signups_30d}`}
                />
                <MetricCard
                  icon={<Calendar className="w-4 h-4" />}
                  label={t('users.metricSignups7d')}
                  value={`+${userMetrics.signups_7d}`}
                  detail={`${t('users.metricSignups30d')}: +${userMetrics.signups_30d}`}
                />
                <MetricCard
                  icon={<Banknote className="w-4 h-4" />}
                  label={t('users.metricConversion')}
                  value={`${userMetrics.paid_conversion_rate}%`}
                  detail={`${userMetrics.paid_users_count} ta to'lovchi talaba`}
                />
                <MetricCard
                  icon={<Target className="w-4 h-4" />}
                  label={t('users.metricRepeat')}
                  value={`${userMetrics.repeat_rate}%`}
                  detail={`${userMetrics.repeat_users_count} ta takroriy (2+)`}
                />
              </div>
            )}

            {/* Search and Filters */}
            <div className="bg-white/95 rounded-3xl border border-amber-900/15 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchAdminUsers(1, userSearch);
                }}
                className="w-full sm:w-80 flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={t('users.searchPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl outline-none focus:bg-white focus:border-amber-700"
                  />
                </div>
                <button
                  type="submit"
                  disabled={userLoading}
                  className="px-3 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {userLoading ? '...' : <Search className="w-3.5 h-3.5" />}
                </button>
              </form>

              {userActionError && (
                <div className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{userActionError}</span>
                </div>
              )}
            </div>

            {/* Users Table */}
            {adminUsers.length === 0 ? (
              <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
                <Users className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-base text-amber-950">{t('users.emptyTitle')}</h4>
                <p className="text-xs text-stone-500 mt-1">{t('users.emptyBody')}</p>
              </div>
            ) : (
              <div className="bg-white/95 rounded-3xl border border-amber-900/15 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-amber-50/80 border-b border-amber-900/10 text-amber-950 font-serif font-bold">
                        <th className="p-4">{t('users.colName')}</th>
                        <th className="p-4">{t('users.colProvider')}</th>
                        <th className="p-4">{t('users.colSignup')}</th>
                        <th className="p-4">{t('users.colOrders')}</th>
                        <th className="p-4">{t('users.colLastActivity')}</th>
                        <th className="p-4">{t('users.colStatus')}</th>
                        <th className="p-4">{t('users.colActions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-900/10">
                      {adminUsers.map((u) => {
                        const signupDate = u.signup_date ? new Date(u.signup_date).toLocaleDateString() : '—';
                        const lastAct = u.last_activity ? new Date(u.last_activity).toLocaleDateString() : '—';

                        return (
                          <tr key={u.id} className="hover:bg-amber-50/30 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-stone-900">{u.name || '—'}</div>
                              <div className="text-[11px] text-stone-500 font-mono">{u.email || '—'}</div>
                              <div className="flex items-center gap-1.5 mt-1">
                                {u.is_under_18 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                                    {t('users.under18Badge')}
                                  </span>
                                )}
                                {u.education_stage && (
                                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                                    {u.education_stage}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                                {u.login_provider}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-stone-600">
                              {signupDate}
                            </td>
                            <td className="p-4">
                              <div className="space-y-0.5 text-[11px]">
                                <div className="font-medium text-stone-800">
                                  {t('users.bookingCount', { count: u.bookings_count })}
                                </div>
                                <div className="text-emerald-800 font-medium">
                                  {t('users.threadCount', { count: u.paid_threads_count })}
                                </div>
                                <div className="text-stone-500">
                                  {t('users.reviewCount', { count: u.reviews_count })}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 font-mono text-stone-600">
                              {lastAct}
                            </td>
                            <td className="p-4 space-y-1">
                              <div>
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    u.is_blocked
                                      ? 'bg-red-100 text-red-800 border border-red-300'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  }`}
                                >
                                  {u.is_blocked ? t('users.statusBlocked') : t('users.statusActive')}
                                </span>
                              </div>
                              {u.is_test && (
                                <div>
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                    {t('users.statusTest')}
                                  </span>
                                </div>
                              )}
                              {u.blocked_reason && (
                                <div className="text-[10px] text-red-700 italic max-w-[150px] truncate" title={u.blocked_reason}>
                                  {u.blocked_reason}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                {u.is_blocked ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUnblockUser(u)}
                                    disabled={isSubmittingUserAction}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    {t('users.unblockButton')}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmingBlockUser(u);
                                      setBlockReasonInput('');
                                    }}
                                    disabled={isSubmittingUserAction}
                                    className="px-2.5 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    {t('users.blockButton')}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setConfirmingDeleteUser(u)}
                                  disabled={isSubmittingUserAction}
                                  className="px-2.5 py-1 rounded-lg bg-red-700 hover:bg-red-800 text-white text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  {t('users.deleteButton')}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleTestUser(u)}
                                  title="Test hisob sifatida belgilash / yechish"
                                  className={`p-1 rounded-lg text-[10px] font-mono border transition-all cursor-pointer ${
                                    u.is_test
                                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                                      : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                                  }`}
                                >
                                  T
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {userTotalPages > 1 && (
                  <div className="p-4 border-t border-amber-900/10 flex items-center justify-between text-xs text-stone-600 bg-amber-50/40">
                    <span>Sahifa: {userPage} / {userTotalPages}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={userPage <= 1 || userLoading}
                        onClick={() => fetchAdminUsers(userPage - 1, userSearch)}
                        className="px-3 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
                      >
                        « Oldingi
                      </button>
                      <button
                        type="button"
                        disabled={userPage >= userTotalPages || userLoading}
                        onClick={() => fetchAdminUsers(userPage + 1, userSearch)}
                        className="px-3 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
                      >
                        Keyingi »
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Block User Modal */}
            {confirmingBlockUser && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-amber-900/15">
                  <div className="flex items-center justify-between border-b border-amber-900/10 pb-3">
                    <h3 className="font-serif font-bold text-base text-amber-950 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-amber-700" />
                      {t('users.confirmBlockTitle')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setConfirmingBlockUser(null)}
                      className="text-stone-400 hover:text-stone-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-xs text-stone-600">
                    {t('users.confirmBlockPrompt')}
                  </p>

                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-900/10 text-xs">
                    <div><strong>Ism:</strong> {confirmingBlockUser.name || '—'}</div>
                    <div><strong>Email:</strong> {confirmingBlockUser.email || '—'}</div>
                  </div>

                  <form onSubmit={handleBlockUserSubmit} className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">
                        Bloklash sababi (ixtiyoriy):
                      </label>
                      <input
                        type="text"
                        value={blockReasonInput}
                        onChange={(e) => setBlockReasonInput(e.target.value)}
                        placeholder="Qoidabuzarlik, spam..."
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:bg-white focus:border-amber-700"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingBlockUser(null)}
                        className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold cursor-pointer"
                      >
                        Bekor qilish
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingUserAction}
                        className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingUserAction ? '...' : t('users.blockButton')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete User Modal (Confirmation Dialog) */}
            {confirmingDeleteUser && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-red-900/20">
                  <div className="flex items-center justify-between border-b border-red-900/10 pb-3">
                    <h3 className="font-serif font-bold text-base text-red-950 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-700" />
                      {t('users.confirmDeleteTitle')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteUser(null)}
                      className="text-stone-400 hover:text-stone-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-xs text-red-800 bg-red-50 p-3 rounded-xl border border-red-200">
                    {t('users.confirmDeletePrompt')}
                  </p>

                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
                    <div><strong>Ism:</strong> {confirmingDeleteUser.name || '—'}</div>
                    <div><strong>Email:</strong> {confirmingDeleteUser.email || '—'}</div>
                  </div>

                  {userActionError && (
                    <p className="text-xs text-red-700 font-semibold bg-red-50 p-2 rounded-lg border border-red-200">
                      {userActionError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteUser(null)}
                      className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold cursor-pointer"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteUserSubmit}
                      disabled={isSubmittingUserAction}
                      className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingUserAction ? '...' : t('users.deleteButton')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'threads' && (
          <div className="space-y-6">
            {threads.length === 0 ? (
              <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
                <MessagesSquare className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-base text-amber-950">{t('threads.emptyTitle')}</h4>
                <p className="text-xs text-stone-500 mt-1">{t('threads.emptyBody')}</p>
              </div>
            ) : (
              <div className="bg-white/95 rounded-3xl border border-amber-900/15 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-amber-50/80 border-b border-amber-900/10 text-amber-950 font-serif font-bold">
                        <th className="p-4">{t('threads.colStudent')}</th>
                        <th className="p-4">{t('threads.colCounselor')}</th>
                        <th className="p-4">{t('threads.colQuestions')}</th>
                        <th className="p-4">{t('threads.colTotal')}</th>
                        <th className="p-4">{t('threads.colStatus')}</th>
                        <th className="p-4">{t('threads.colActions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-900/10">
                      {threads.map((th) => {
                        const totalExpected = (th.questions_paid || th.soft_cap || 1) * th.price_per_question;
                        const isOverdue = Boolean(th.is_overdue);

                        return (
                          <tr key={th.id} className="hover:bg-amber-50/30 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-stone-900">{th.booking?.student_name || '—'}</div>
                              <div className="text-[11px] text-stone-500">{th.booking?.email}</div>
                              <div className="text-[10px] text-amber-800 font-semibold">{th.booking?.telegram}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-amber-950">{th.counselor?.full_name || th.counselor_id}</div>
                              <div className="text-[10px] text-stone-500 line-clamp-1">{th.counselor?.headline}</div>
                            </td>
                            <td className="p-4 font-mono">
                              <span className="font-bold">{th.questions_used}</span> / {th.questions_paid || th.soft_cap || 1}
                            </td>
                            <td className="p-4">
                              <div className="font-mono font-bold text-amber-900">
                                {(th.total_paid || totalExpected).toLocaleString()} UZS
                              </div>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 mt-1 inline-block">
                                {th.payment_method || 'click'}
                              </span>
                            </td>
                            <td className="p-4 space-y-1">
                              <div>
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    th.payment_status === 'closed'
                                      ? 'bg-stone-200 text-stone-700 border border-stone-300'
                                      : th.payment_status === 'pending_payment'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  }`}
                                >
                                  {th.payment_status === 'closed' ? (
                                    <CheckCircle className="w-3 h-3" />
                                  ) : th.payment_status === 'pending_payment' ? (
                                    <Clock className="w-3 h-3" />
                                  ) : (
                                    <MessagesSquare className="w-3 h-3" />
                                  )}
                                  {th.payment_status === 'closed'
                                    ? (th.reply_status === 'refunded' ? 'Qaytarilgan (Refunded)' : t('threads.statusClosed'))
                                    : th.payment_status === 'pending_payment'
                                    ? t('threads.statusPendingPayment')
                                    : t('threads.statusPaid')}
                                </span>
                              </div>

                              {isOverdue && (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                    <AlertCircle className="w-3 h-3" /> {t('threads.overdueBadge')}
                                  </span>
                                </div>
                              )}

                              {th.payment_receipt && th.payment_status === 'pending_payment' && (
                                <div className="text-[10px] text-stone-600 bg-amber-50/80 px-2 py-1 rounded border border-amber-200 max-w-[200px] truncate" title={th.payment_receipt}>
                                  <strong>Chek:</strong> {th.payment_receipt}
                                </div>
                              )}

                              {th.bank_reference && (
                                <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                  <strong>Ref:</strong> {th.bank_reference}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="space-y-1.5">
                                {th.payment_status === 'pending_payment' && (
                                  <button
                                    type="button"
                                    onClick={() => openConfirmModal(th)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-emerald-50 text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                                  >
                                    <CheckCircle className="w-3 h-3" /> {t('threads.confirmPaymentButton')}
                                  </button>
                                )}

                                {th.payment_status === 'paid' && isOverdue && (
                                  <div className="flex flex-col gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleRefundThread(th.id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-700 hover:bg-red-800 text-white text-[10px] font-bold transition-all cursor-pointer"
                                    >
                                      <XCircle className="w-3 h-3" /> {t('threads.refundButton')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReassignThread(th.id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-700 hover:bg-stone-800 text-white text-[10px] font-bold transition-all cursor-pointer"
                                    >
                                      <UserCheck className="w-3 h-3" /> {t('threads.reassignButton')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-amber-900/15 bg-white p-4 shadow-xs">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">{icon}</span>
        {label}
      </div>
      <div className="mt-3 font-serif text-xl font-extrabold text-amber-950 sm:text-2xl">{value}</div>
      <div className="mt-1 text-[10px] text-stone-500">{detail}</div>
    </div>
  );
}
