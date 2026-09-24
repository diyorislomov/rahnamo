'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { BookingTicketData, ForumQuestion, ForumAnswer, SurveyResponse, Counselor } from '@/types';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import { mapCounselorRow } from '@/lib/counselors';
import { mapForumQuestion, mapForumAnswer, loadLocalForumQuestions, loadLocalForumAnswers } from '@/lib/forum';
import { announceStaleBuild, isRunningStaleBuild } from '@/lib/buildVersion';
import { ShieldCheck, UserCheck, Calendar, Video, Mail, ExternalLink, CheckCircle, XCircle, Clock, Search, RefreshCw, Lock, LogOut, KeyRound, MessageCircleQuestion, Trash2, ClipboardList, Users, MessagesSquare, Flag } from 'lucide-react';

interface CounselorApp {
  id?: string;
  full_name: string;
  headline: string;
  // `category` and `company` only exist on the hardcoded mock fallback rows
  // below -- the real `counselor_applications` table (and the live
  // /become-counselor form) has neither column, only `specialties` (a plain
  // comma-separated string). Both must stay optional or every real
  // application renders "undefined" in this tab.
  category?: string;
  specialties?: string;
  bio: string;
  company?: string;
  email: string;
  phone: string;
  telegram: string;
  linkedin?: string;
  expected_standard_price: number;
  expected_premium_price: number;
  expected_price_per_question?: number | null;
  expected_soft_cap?: number | null;
  status?: 'pending' | 'approved' | 'rejected';
}

interface AdminThread {
  id: string;
  booking_id: string;
  counselor_id: string;
  price_per_question: number;
  soft_cap: number | null;
  questions_used: number;
  total_owed: number;
  payment_status: 'active' | 'awaiting_payment' | 'closed';
  payment_receipt: string | null;
  created_at: string;
  closed_at: string | null;
  booking: { student_name: string; email: string; telegram: string } | null;
  counselor: { full_name: string; headline: string } | null;
}

// Shared by reject/approve/delete below -- all three need to patch the same
// `rahnamo_applications` localStorage cache, which is what this tab actually
// renders from whenever the Supabase fetch comes back empty (see comment at
// the SELECT policy in schema.sql for why that was always happening before).
// Without this, a page refresh silently reverted every status change back
// to the stale cached copy, regardless of whether the Supabase write itself
// succeeded.
function persistLocalApplications(updater: (apps: CounselorApp[]) => CounselorApp[]) {
  try {
    const existing: CounselorApp[] = JSON.parse(localStorage.getItem('rahnamo_applications') || '[]');
    localStorage.setItem('rahnamo_applications', JSON.stringify(updater(existing)));
  } catch (err) {
    console.error(err);
  }
}

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const dateLocale = t('dateLocale');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'bookings' | 'applications' | 'forum' | 'survey' | 'counselors' | 'threads'>('bookings');
  const [bookings, setBookings] = useState<BookingTicketData[]>([]);
  const [applications, setApplications] = useState<CounselorApp[]>([]);
  const [forumQuestions, setForumQuestions] = useState<ForumQuestion[]>([]);
  const [forumAnswers, setForumAnswers] = useState<ForumAnswer[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [threads, setThreads] = useState<AdminThread[]>([]);
  const [threadActionId, setThreadActionId] = useState<string | null>(null);
  const [threadActionErrors, setThreadActionErrors] = useState<{ [id: string]: string }>({});
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
    
    // 1. Fetch Bookings from LocalStorage + Supabase
    let localBookings: BookingTicketData[] = [];
    try {
      localBookings = JSON.parse(localStorage.getItem('rahnamo_bookings') || '[]');
    } catch (e) {
      console.error(e);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      try {
        const { data: supaBookings } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
        if (supaBookings && supaBookings.length > 0) {
          const mapped: BookingTicketData[] = supaBookings.map((b) => ({
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
            meetLink: b.meet_link,
            paymentStatus: b.payment_status || 'pending',
            paymentReceipt: b.payment_receipt || '',
            status: b.status || 'confirmed',
            locale: b.locale || 'uz',
            createdAt: b.created_at,
          }));

          // Local goes in FIRST so it only ever fills a genuine gap (a
          // booking made while Supabase was unreachable) -- Supabase's row
          // must win for any id both sources have, same fix and same root
          // cause as /my-bookings' merge bug: this used to put local first
          // in the array and then only ADD supabase rows whose id wasn't
          // already known locally, which meant a stale local copy on
          // admin's own device would permanently mask a real status change
          // made from a different session (e.g. a student confirming their
          // own booking, or another admin device), no matter how many
          // times this page was refreshed.
          const mergedMap = new Map<string, BookingTicketData>();
          localBookings.forEach((b) => mergedMap.set(b.id, b));
          mapped.forEach((b) => mergedMap.set(b.id, b));
          const combined = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          setBookings(combined);
        } else {
          setBookings(localBookings);
        }

        // 2. Fetch Applications from Supabase
        const { data: supaApps } = await supabase.from('counselor_applications').select('*');
        if (supaApps && supaApps.length > 0) {
          setApplications(supaApps);
        } else {
          const localApps = JSON.parse(localStorage.getItem('rahnamo_applications') || '[]');
          setApplications(localApps);
        }

        // 3. Fetch Forum questions & answers (moderation view — read-only)
        const [{ data: supaQuestions }, { data: supaAnswers }] = await Promise.all([
          supabase.from('forum_questions').select('*').order('created_at', { ascending: false }),
          supabase.from('forum_answers').select('*'),
        ]);
        setForumQuestions(
          supaQuestions && supaQuestions.length > 0 ? supaQuestions.map(mapForumQuestion) : loadLocalForumQuestions()
        );
        setForumAnswers(
          supaAnswers && supaAnswers.length > 0 ? supaAnswers.map(mapForumAnswer) : loadLocalForumAnswers()
        );

        // 4. Fetch survey responses -- no localStorage fallback exists for
        // this one (built after tonight's lessons, deliberately without a
        // cache layer), so an empty/failed fetch just means an empty list.
        const { data: supaSurvey } = await supabase
          .from('survey_responses')
          .select('*')
          .order('created_at', { ascending: false });
        setSurveyResponses(
          (supaSurvey || []).map((s) => ({
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

        // 5. Fetch the live counselor roster -- for the commission-window
        // badge, which needs joined_at/commission_free_until straight from
        // the counselors table, not the applications table (an approved
        // application isn't linked back to the counselor row it created).
        const { data: supaCounselors } = await supabase
          .from('counselors')
          .select('*')
          .order('joined_at', { ascending: false });
        setCounselors((supaCounselors || []).map(mapCounselorRow));

        // 6. Text Q&A threads -- goes through the admin API route, not a
        // direct anon-key query, since anon has no grant on
        // question_threads.payment_status at all (by design -- see
        // schema.sql). This route uses service_role behind the admin
        // session cookie instead.
        try {
          const threadsRes = await fetch('/api/admin/threads');
          const threadsData = await threadsRes.json();
          setThreads(threadsData.success ? threadsData.threads : []);
        } catch (err) {
          console.warn('Threads fetch error:', err);
          setThreads([]);
        }
      } catch (err) {
        console.warn('Supabase fetch error:', err);
        setBookings(localBookings);
        setApplications(JSON.parse(localStorage.getItem('rahnamo_applications') || '[]'));
        setForumQuestions(loadLocalForumQuestions());
        setForumAnswers(loadLocalForumAnswers());
      }
    } else {
      setBookings(localBookings);
      setApplications(JSON.parse(localStorage.getItem('rahnamo_applications') || '[]'));
      setForumQuestions(loadLocalForumQuestions());
      setForumAnswers(loadLocalForumAnswers());
    }

    setLoading(false);
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
    const entered = adminPassword.trim();

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: entered }),
    })
      .then((res) => res.json())
      .then(({ success }) => {
        if (success) {
          setIsAuthenticated(true);
          setLoginError('');
          fetchAdminData();
        } else {
          setLoginError(t('login.wrongPassword'));
        }
      })
      .catch(() => setLoginError(t('login.checkFailed')));
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
    // skipping the whole Supabase branch is exactly how an admin could
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      // .select() after .update() is deliberate, not decorative: RLS can
      // silently affect zero rows with error === null (a real, reproduced
      // case this exact session hit -- an UPDATE that "succeeds" with a
      // clean 204 while the row never actually changes). Only a non-empty
      // returned row proves the write really happened.
      const { data, error } = await supabase
        .from('bookings')
        .update({ payment_status: 'confirmed' })
        .eq('id', id)
        .select('id, payment_status');

      if (error || !data || data.length === 0) {
        console.error('[PAYMENT_CONFIRM_FAILED]', id, { error, rowsAffected: data?.length ?? 0 });
        setBookingActionId(null);
        setBookingActionErrors((prev) => ({
          ...prev,
          [id]: t('bookings.confirmPaymentFailed'),
        }));
        return;
      }
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, paymentStatus: 'confirmed' } : b))
    );
    try {
      const existing: BookingTicketData[] = JSON.parse(localStorage.getItem('rahnamo_bookings') || '[]');
      const updated = existing.map((b) => (b.id === id ? { ...b, paymentStatus: 'confirmed' } : b));
      localStorage.setItem('rahnamo_bookings', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

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
          studentName: booking.studentName,
          counselorName: booking.counselorName,
          tier: booking.tier,
          price: booking.price,
          slot: booking.slot,
          paymentMethod: booking.paymentMethod,
          email: booking.email,
          meetLink: booking.meetLink,
          locale: booking.locale || 'uz',
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      // Same reasoning as handleApprovePayment above: a clean "no error"
      // response is not proof anything actually changed under RLS.
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', id)
        .select('id');

      if (error || !data || data.length === 0) {
        console.error('[COMPLETE_BOOKING_FAILED]', id, { error, rowsAffected: data?.length ?? 0 });
        setBookingActionId(null);
        setBookingActionErrors((prev) => ({
          ...prev,
          [errorKey]: t('bookings.completeBookingFailed'),
        }));
        return;
      }
    }

    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'completed' } : b)));
    try {
      const existing: BookingTicketData[] = JSON.parse(localStorage.getItem('rahnamo_bookings') || '[]');
      const updated = existing.map((b) => (b.id === id ? { ...b, status: 'completed' as const } : b));
      localStorage.setItem('rahnamo_bookings', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setBookingActionId(null);
  };

  // Both actions go through /api/admin/threads (service_role behind the
  // admin session cookie) -- anon has no grant on payment_status, so a
  // direct supabase.from('question_threads').update(...) the way bookings
  // does it would just silently fail RLS the same way admin's "confirm
  // payment" button used to before that got a real UPDATE policy.
  const handleThreadAction = async (threadId: string, action: 'flag' | 'confirm_payment') => {
    setThreadActionId(threadId);
    setThreadActionErrors((prev) => ({ ...prev, [threadId]: '' }));

    try {
      const res = await fetch('/api/admin/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, action }),
      });
      const data = await res.json();

      if (!data.success) {
        console.error('[THREAD_ACTION_FAILED]', action, threadId, data.error);
        setThreadActionErrors((prev) => ({
          ...prev,
          [threadId]: action === 'flag' ? t('threads.flagFailed') : t('threads.confirmFailed'),
        }));
        setThreadActionId(null);
        return;
      }

      setThreads((prev) =>
        prev.map((th) => (th.id === threadId ? { ...th, payment_status: data.thread.payment_status } : th))
      );
    } catch (err) {
      console.error('[THREAD_ACTION_FAILED]', action, threadId, err);
      setThreadActionErrors((prev) => ({
        ...prev,
        [threadId]: t('threads.networkError'),
      }));
    }
    setThreadActionId(null);
  };

  const handleApproveApplication = (app: CounselorApp) => {
    const appKey = app.id || app.email;
    setApplications((prev) =>
      prev.map((a) => ((a.id || a.email) === appKey ? { ...a, status: 'approved' } : a))
    );
    persistLocalApplications((apps) =>
      apps.map((a) => ((a.id || a.email) === appKey ? { ...a, status: 'approved' } : a))
    );

    const newCounselorId = `c-${(app.full_name || 'mentor')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) return;

    Promise.resolve(
      supabase.from('counselors').insert({
        id: newCounselorId,
        full_name: app.full_name,
        headline: app.headline,
        avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
        specialties: app.specialties
          ? app.specialties.split(',').map((s) => s.trim()).filter(Boolean)
          : [app.category || 'Umumiy'],
        bio: app.bio,
        standard_price: app.expected_standard_price || 45000,
        premium_price: app.expected_premium_price || 130000,
        rating: 5.0,
        reviews_count: 0,
        // Placeholder starting slots -- there's no counselor-facing
        // schedule editor yet, so leaving this empty would make a newly
        // approved counselor permanently unbookable. Real slot management
        // is a follow-up feature, not this one.
        available_slots: ['Dushanba, 19:00 - 19:30', 'Chorshanba, 19:00 - 19:30', 'Shanba, 12:00 - 12:30'],
        company: app.company || null,
        price_per_question: app.expected_price_per_question || null,
        soft_cap: app.expected_soft_cap || null,
      })
    )
      .then(({ error }) => {
        if (error) {
          console.warn('Counselor insert error:', error);
          return;
        }
        if (app.id) {
          return Promise.resolve(
            supabase.from('counselor_applications').update({ status: 'approved' }).eq('id', app.id)
          );
        }
      })
      .catch((err) => console.warn('Application approve error:', err));
  };

  const handleRejectApplication = (app: CounselorApp) => {
    const appKey = app.id || app.email;
    setApplications((prev) =>
      prev.map((a) => ((a.id || a.email) === appKey ? { ...a, status: 'rejected' } : a))
    );
    persistLocalApplications((apps) =>
      apps.map((a) => ((a.id || a.email) === appKey ? { ...a, status: 'rejected' } : a))
    );

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !app.id) return;

    Promise.resolve(supabase.from('counselor_applications').update({ status: 'rejected' }).eq('id', app.id)).catch(
      (err) => console.warn('Application reject error:', err)
    );
  };

  const handleDeleteApplication = (app: CounselorApp) => {
    const confirmed = window.confirm(t('applications.deleteConfirm', { name: app.full_name }));
    if (!confirmed) return;

    const appKey = app.id || app.email;
    setApplications((prev) => prev.filter((a) => (a.id || a.email) !== appKey));
    persistLocalApplications((apps) => apps.filter((a) => (a.id || a.email) !== appKey));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !app.id) return;

    Promise.resolve(supabase.from('counselor_applications').delete().eq('id', app.id)).catch((err) =>
      console.warn('Application delete error:', err)
    );
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
                    type="password"
                    placeholder="••••••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>
                {loginError && <p className="text-[11px] text-red-600 font-semibold mt-1.5">{loginError}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-amber-300" />
                <span>{t('login.submit')}</span>
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

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-3 mb-6 border-b border-amber-900/15 pb-3">
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
        </div>

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
                                <button
                                  type="button"
                                  onClick={() => handleApprovePayment(b)}
                                  disabled={bookingActionId === b.id}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-emerald-50 text-[10px] font-bold transition-all shadow-2xs cursor-pointer block disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {bookingActionId === b.id ? t('bookings.approving') : t('bookings.approvePayment')}
                                </button>
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
                      "{app.bio}"
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 font-mono">
                      <div>📧 {app.email}</div>
                      <div>📞 {app.phone}</div>
                      <div>💬 {app.telegram}</div>
                      <div>
                        {app.linkedin ? (
                          <a href={app.linkedin} target="_blank" rel="noreferrer" className="text-amber-800 underline">
                            {t('applications.linkedinProfile')}
                          </a>
                        ) : (
                          <span className="text-stone-400">{t('applications.linkedinNotProvided')}</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-amber-900/10 flex items-center justify-between">
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
                          disabled={app.status === 'approved' || app.status === 'rejected'}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-900 text-amber-50 text-xs font-bold hover:bg-amber-800 transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {t('applications.approve')}
                        </button>
                      </div>
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
                              const responder = INITIAL_COUNSELORS.find((c) => c.id === a.counselorId);
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

        {/* Tab 4: Survey Responses -- read-only lead list, no actions */}
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

                    <div className="pt-3 border-t border-amber-900/10 flex items-center justify-between text-[11px] text-stone-500">
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

                      <div className="pt-3 border-t border-amber-900/10 flex items-center justify-between text-[11px] text-stone-500">
                        <span>{t('counselors.ratingLabel', { rating: c.rating, count: c.reviewsCount })}</span>
                        <span>{c.joinedAt ? t('counselors.joinedLabel', { date: new Date(c.joinedAt).toLocaleDateString(dateLocale) }) : ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Text Q&A threads. The only actions here go through
            /api/admin/threads (service_role behind this page's own admin
            session) -- see handleThreadAction above for why a direct
            supabase.from(...).update() the way bookings does it wouldn't
            work for this table. */}
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
                      {threads.map((th) => (
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
                            {th.questions_used}
                            {th.soft_cap ? ` / ${th.soft_cap}` : ''}
                          </td>
                          <td className="p-4 font-mono font-bold text-amber-900">
                            {th.total_owed.toLocaleString()} UZS
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                th.payment_status === 'closed'
                                  ? 'bg-stone-200 text-stone-700 border border-stone-300'
                                  : th.payment_status === 'awaiting_payment'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              {th.payment_status === 'closed' ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : th.payment_status === 'awaiting_payment' ? (
                                <Clock className="w-3 h-3" />
                              ) : (
                                <MessagesSquare className="w-3 h-3" />
                              )}
                              {th.payment_status === 'closed'
                                ? t('threads.statusClosed')
                                : th.payment_status === 'awaiting_payment'
                                ? t('threads.statusAwaitingPayment')
                                : t('threads.statusActive')}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1.5">
                              {threadActionErrors[th.id] && (
                                <div className="flex items-start gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-300 rounded-lg px-2 py-1.5 max-w-[200px]">
                                  <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                  <span>{threadActionErrors[th.id]}</span>
                                </div>
                              )}
                              {th.payment_status === 'active' && !th.soft_cap && (
                                <button
                                  type="button"
                                  onClick={() => handleThreadAction(th.id, 'flag')}
                                  disabled={threadActionId === th.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-amber-50 text-[10px] font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                                >
                                  <Flag className="w-3 h-3" /> {t('threads.flagButton')}
                                </button>
                              )}
                              {th.payment_status === 'awaiting_payment' && (
                                <button
                                  type="button"
                                  onClick={() => handleThreadAction(th.id, 'confirm_payment')}
                                  disabled={threadActionId === th.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-emerald-50 text-[10px] font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                                >
                                  <CheckCircle className="w-3 h-3" /> {t('threads.confirmPaymentButton')}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
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
