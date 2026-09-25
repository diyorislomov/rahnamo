'use client';

import { formatInteger } from '@/lib/format';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { CheckCircle2, Loader2, MessageCircle, RefreshCw, Send } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Counselor } from '@/types';
import { studentAccessToken } from './studentJourney';
import PaymentInstructions from './PaymentInstructions';

type ThreadRow = { id: string; booking_id: string; price_per_question: number; soft_cap: number | null; questions_used: number; total_owed: number; payment_status: 'active' | 'awaiting_payment' | 'closed'; payment_receipt: string | null };
type MessageRow = { id: string; sender_role: 'student' | 'counselor'; body: string; created_at: string };

export default function TextQaPanel({ counselor, bookingId }: { counselor: Counselor; bookingId?: string }) {
  const t = useTranslations('journeys');
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [thread, setThread] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [age, setAge] = useState(false);
  const [draft, setDraft] = useState('');
  const [receipt, setReceipt] = useState('');
  const [busy, setBusy] = useState<'start' | 'ask' | 'receipt' | null>(null);
  const [actionError, setActionError] = useState('');
  const [syncError, setSyncError] = useState(false);
  const busyRef = useRef(false);
  const startRequest = useRef<string | null>(null);
  const askRequest = useRef<{ id: string; body: string } | null>(null);
  const demo = !isSupabaseConfigured();

  const readThread = useCallback(async (id: string, signal?: AbortSignal) => {
    const threadQuery = supabase.from('question_threads').select('*').eq('id', id);
    const messageQuery = supabase.from('thread_messages').select('id,sender_role,body,created_at').eq('thread_id', id).order('created_at', { ascending: true });
    const [a, b] = await Promise.all([signal ? threadQuery.abortSignal(signal).single() : threadQuery.single(), signal ? messageQuery.abortSignal(signal) : messageQuery]);
    if (a.error || b.error || !a.data) throw new Error('load_failed');
    return { thread: a.data as ThreadRow, messages: (b.data || []) as MessageRow[] };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setLoadError('');
      try {
        if (demo) return;
        const { data: session, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;
        if (!session.session) { if (bookingId) throw new Error('missing'); return; }
        let query = supabase.from('question_threads').select('*').eq('counselor_id', counselor.id).eq('student_auth_id', session.session.user.id);
        if (bookingId) query = query.eq('booking_id', bookingId);
        else query = query.neq('payment_status', 'closed');
        const { data, error } = await query.order('created_at', { ascending: false }).limit(1).abortSignal(controller.signal).maybeSingle();
        if (error || (!data && bookingId)) throw error || new Error('missing');
        if (!data || controller.signal.aborted) return;
        const result = await readThread(data.id, controller.signal);
        if (!controller.signal.aborted) { setThread(result.thread); setMessages(result.messages); }
      } catch { if (!controller.signal.aborted) setLoadError(bookingId ? t('threadNotFound') : t('threadLoadFailed')); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [bookingId, counselor.id, demo, attempt, readThread, t]);

  const threadId = thread?.id;
  useEffect(() => {
    if (!threadId) return;
    const controller = new AbortController();
    let running = false;
    const timer = setInterval(async () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const result = await readThread(threadId, controller.signal);
        if (!controller.signal.aborted) { setThread(result.thread); setMessages(result.messages); setSyncError(false); }
      } catch { if (!controller.signal.aborted) setSyncError(true); }
      finally { running = false; }
    }, 5000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [threadId, readThread]);

  async function start() {
    if (!age || busyRef.current) return;
    busyRef.current = true; setBusy('start'); setActionError('');
    startRequest.current ||= crypto.randomUUID();
    try {
      const token = await studentAccessToken();
      const res = await fetch('/api/threads/start', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: startRequest.current, counselorId: counselor.id, ageConfirmed: true, locale }) });
      const data = await res.json();
      if (!res.ok || !data.success || !data.thread) throw new Error('start_failed');
      const result = await readThread(data.thread.id);
      setThread(result.thread); setMessages(result.messages);
      const url = new URL(window.location.href); url.searchParams.set('mode', 'text'); url.searchParams.set('booking', data.thread.booking_id); window.history.replaceState(null, '', url);
    } catch { setActionError(t('threadStartFailed')); }
    finally { busyRef.current = false; setBusy(null); }
  }

  async function ask() {
    const body = draft.trim();
    if (!thread || !body || busyRef.current) return;
    busyRef.current = true; setBusy('ask'); setActionError('');
    if (askRequest.current?.body !== body) askRequest.current = { id: crypto.randomUUID(), body };
    try {
      const { data, error } = await supabase.rpc('ask_thread_question', { p_thread_id: thread.id, p_body: body, p_request_id: askRequest.current.id });
      if (error || !data?.success) throw new Error(data?.reason || 'ask_failed');
      // Only reset this id after an acknowledged save; uncertain retries reuse it.
      askRequest.current = null; setDraft('');
      try { const result = await readThread(thread.id); setThread(result.thread); setMessages(result.messages); setSyncError(false); }
      catch { setSyncError(true); }
    } catch { setActionError(t('questionFailed')); }
    finally { busyRef.current = false; setBusy(null); }
  }

  async function submitReceipt() {
    if (!thread || !receipt.trim() || busyRef.current) return;
    busyRef.current = true; setBusy('receipt'); setActionError('');
    try {
      const { data, error } = await supabase.from('question_threads').update({ payment_receipt: receipt.trim() }).eq('id', thread.id).select('*').single();
      if (error || !data) throw error || new Error('save_failed');
      setThread(data as ThreadRow); setReceipt('');
    } catch { setActionError(t('receiptFailed')); }
    finally { busyRef.current = false; setBusy(null); }
  }

  if (loading) return <section className="ui-panel p-8" role="status"><Loader2 className="animate-spin mb-3" aria-hidden /><p className="ui-muted">{t('loadingConversation')}</p></section>;
  if (loadError) return <section className="ui-panel p-6 space-y-4"><p className="ui-alert" role="alert">{loadError}</p><button className="ui-button-secondary" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={17} aria-hidden />{t('retry')}</button><Link href="/my-bookings" className="block text-sm font-semibold text-amber-900">{t('openBookings')}</Link></section>;
  if (!thread) return <section className="ui-panel p-6 sm:p-8 space-y-5"><div className="h-12 w-12 bg-amber-100 rounded-2xl flex items-center justify-center"><MessageCircle size={24} aria-hidden /></div><div><p className="ui-eyebrow">{t('textConsultation')}</p><h2 className="font-serif text-3xl mt-2">{t('textStartTitle')}</h2><p className="ui-muted leading-relaxed mt-3">{t('textStartBody')}</p></div><div className="rounded-2xl bg-stone-50 p-5"><p className="font-semibold">{t('perQuestion', { amount: formatInteger(counselor.pricePerQuestion || 0, locale) })}</p><p className="ui-muted text-sm mt-2">{counselor.softCap ? t('softCapHelp', { count: counselor.softCap }) : t('noCapHelp')}</p></div>{demo ? <p className="ui-alert">{t('textDemoNotice')}</p> : <><label className="flex items-start gap-3 text-sm leading-relaxed"><input className="mt-1 h-4 w-4 accent-amber-900" type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} />{t('ageConfirmation')}</label>{actionError && <p className="ui-alert" role="alert">{actionError}</p>}<button className="ui-button w-full" disabled={!age || busy !== null || counselor.pricePerQuestion == null} onClick={start}>{busy === 'start' && <Loader2 size={17} className="animate-spin" aria-hidden />}{t('startConversation')}</button><p className="ui-muted text-sm">{t('browserIdentity')}</p></>}</section>;

  return <section className="ui-panel overflow-hidden" aria-labelledby="thread-title">
    <div className="p-5 sm:p-6 border-b border-stone-200"><div className="flex justify-between items-start gap-3"><div><p className="ui-eyebrow">{t('textConsultation')}</p><h2 id="thread-title" className="font-serif text-2xl mt-1">{t('yourConversation')}</h2></div><span className="ui-status">{t(thread.payment_status === 'active' ? 'threadActive' : thread.payment_status === 'closed' ? 'threadClosed' : 'awaitingPayment')}</span></div><div className="flex flex-wrap justify-between gap-2 text-sm mt-4"><span className="ui-muted">{t('questionsUsed', { count: thread.questions_used })}{thread.soft_cap ? ` / ${thread.soft_cap}` : ''}</span><strong>{t('balance', { amount: formatInteger(thread.total_owed, locale) })}</strong></div></div>
    {syncError && <p className="ui-alert m-4" role="status">{t('syncDelayed')}</p>}
    <div className="p-5 sm:p-6 space-y-4 min-h-60 max-h-[30rem] overflow-y-auto" role="log" aria-label={t('messages')} aria-live="polite">{messages.length === 0 ? <div className="text-center py-10"><MessageCircle className="mx-auto mb-3 text-amber-800" aria-hidden /><p className="ui-muted">{t('firstQuestion')}</p></div> : messages.map((m) => <article key={m.id} className={`flex ${m.sender_role === 'student' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[90%] rounded-2xl p-4 ${m.sender_role === 'student' ? 'bg-amber-900 text-amber-50 rounded-br-sm' : 'bg-stone-100 text-stone-800 rounded-bl-sm'}`}><p className="text-xs font-semibold opacity-75 mb-2">{m.sender_role === 'student' ? t('you') : counselor.fullName}</p><p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p><time dateTime={m.created_at} className="block mt-2 text-[11px] opacity-65">{new Date(m.created_at).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}</time></div></article>)}</div>
    <div className="p-5 sm:p-6 border-t border-stone-200 space-y-4">{actionError && <p className="ui-alert" role="alert">{actionError}</p>}
      {thread.payment_status === 'active' ? <form onSubmit={(e) => { e.preventDefault(); void ask(); }} className="space-y-3"><label htmlFor="thread-question" className="ui-label">{t('yourQuestion')}</label><textarea id="thread-question" className="ui-input min-h-24" maxLength={4000} required value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('questionPlaceholder')} /><div className="flex items-center justify-between gap-3"><p className="text-xs ui-muted">{t('perQuestion', { amount: formatInteger(thread.price_per_question, locale) })}</p><button className="ui-button" disabled={busy !== null || !draft.trim()}>{busy === 'ask' ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Send size={17} aria-hidden />}{t('sendQuestion')}</button></div></form>
        : thread.payment_status === 'awaiting_payment' ? <><p className="ui-alert">{t('paymentPauseHelp')}</p>{thread.payment_receipt ? <p className="flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 size={18} aria-hidden />{t('receiptSubmitted')}</p> : <><PaymentInstructions /><form onSubmit={(e) => { e.preventDefault(); void submitReceipt(); }} className="space-y-3"><label htmlFor="thread-receipt" className="ui-label">{t('receiptReference')}</label><input id="thread-receipt" className="ui-input" required maxLength={200} value={receipt} onChange={(e) => setReceipt(e.target.value)} /><p className="ui-muted text-sm">{t('receiptHelp')}</p><button className="ui-button w-full" disabled={busy !== null || !receipt.trim()}>{busy === 'receipt' && <Loader2 className="animate-spin" size={17} aria-hidden />}{t('submitReceipt')}</button></form></>}</>
          : <><p className="ui-muted text-sm">{t('closedConversationHelp')}</p><a className="ui-button-secondary w-full" href={`/counselors/${encodeURIComponent(counselor.id)}?mode=text`}>{t('startAnotherConversation')}</a></>}
    </div>
  </section>;
}
