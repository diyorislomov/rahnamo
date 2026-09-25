'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { KeyRound, Loader2, Lock, RefreshCw, Send } from 'lucide-react';
import { Counselor } from '@/types';

type InboxThread = { id: string; questions_used: number; total_owed: number; payment_status: 'active' | 'awaiting_payment' | 'closed' };
type InboxMessage = { id: string; thread_id: string; sender_role: 'student' | 'counselor'; body: string };

export default function MentorInboxPanel({ counselor }: { counselor: Counselor }) {
  const t = useTranslations('journeys');
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const inFlight = useRef(false);

  const loadInbox = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch('/api/threads/mentor-view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ counselorId: counselor.id, passcode }), signal });
    const data = await res.json();
    if (!res.ok || !data.success) {
      if (res.status === 401 || res.status === 403) { setUnlocked(false); setThreads([]); setMessages([]); throw new Error('invalid_passcode'); }
      throw new Error('load_failed');
    }
    if (signal?.aborted) return false;
    setThreads(data.threads || []); setMessages(data.messages || []); setError('');
    return true;
  }, [counselor.id, passcode]);

  useEffect(() => {
    if (!unlocked) return;
    const controller = new AbortController();
    let pending = false;
    const timer = setInterval(async () => {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      try { await loadInbox(controller.signal); }
      catch (err) { if (!controller.signal.aborted) setError(err instanceof Error && err.message === 'invalid_passcode' ? t('invalidPasscode') : t('inboxLoadFailed')); }
      finally { pending = false; }
    }, 7000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [unlocked, loadInbox, t]);

  async function unlock() {
    if (inFlight.current) return;
    inFlight.current = true; setLoading(true); setError('');
    try { const ok = await loadInbox(); if (ok) setUnlocked(true); }
    catch (err) { setError(err instanceof Error && err.message === 'invalid_passcode' ? t('invalidPasscode') : t('inboxLoadFailed')); }
    finally { inFlight.current = false; setLoading(false); }
  }
  async function reply(threadId: string) {
    const body = drafts[threadId]?.trim();
    if (!body || inFlight.current) return;
    inFlight.current = true; setSending(threadId); setError('');
    try {
      const res = await fetch('/api/threads/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId, counselorId: counselor.id, body, passcode }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error('reply_failed');
      setDrafts((prev) => ({ ...prev, [threadId]: '' }));
      if (data.message) setMessages((prev) => prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]);
      try { await loadInbox(); } catch { setError(t('syncDelayed')); }
    } catch { setError(t('replyFailed')); }
    finally { inFlight.current = false; setSending(null); }
  }

  return <div className="space-y-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold flex gap-2 items-center"><KeyRound size={18} aria-hidden />{t('inboxTitle')}</h3>{unlocked && <button className="ui-button-secondary" onClick={() => { setUnlocked(false); setPasscode(''); setThreads([]); setMessages([]); setDrafts({}); }}><Lock size={15} aria-hidden />{t('lockInbox')}</button>}</div>
    {!unlocked ? <form onSubmit={(e) => { e.preventDefault(); void unlock(); }} className="space-y-3"><label htmlFor="mentor-passcode" className="ui-label">{t('mentorPasscode')}</label><input id="mentor-passcode" className="ui-input" type="password" autoComplete="current-password" required value={passcode} onChange={(e) => setPasscode(e.target.value)} /><p className="ui-muted text-sm">{t('mentorPasscodeHelp')}</p><button className="ui-button w-full" disabled={loading || !passcode}>{loading && <Loader2 size={17} className="animate-spin" aria-hidden />}{t('unlockInbox')}</button></form>
      : <><button className="ui-button-secondary" disabled={loading} onClick={unlock}><RefreshCw size={16} aria-hidden />{t('refresh')}</button>{threads.length === 0 ? <p className="ui-muted">{t('inboxEmpty')}</p> : <div className="space-y-4">{threads.map((th) => <article key={th.id} className="rounded-2xl border border-stone-200 p-4 space-y-4"><div className="flex items-center justify-between gap-2 text-sm"><span>{t('questionsUsed', { count: th.questions_used })}</span><span className="ui-status">{t(th.payment_status === 'active' ? 'threadActive' : th.payment_status === 'closed' ? 'threadClosed' : 'awaitingPayment')}</span></div><div className="space-y-3 max-h-80 overflow-y-auto" aria-label={t('messages')}>{messages.filter((m) => m.thread_id === th.id).map((m) => <div key={m.id} className={`rounded-xl p-3 text-sm ${m.sender_role === 'counselor' ? 'bg-amber-50' : 'bg-stone-50'}`}><p className="font-semibold text-xs mb-1">{m.sender_role === 'counselor' ? t('you') : t('student')}</p><p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p></div>)}</div>{th.payment_status !== 'active' && <p className="ui-muted text-xs">{t('mentorPausedHelp')}</p>}<form onSubmit={(e) => { e.preventDefault(); void reply(th.id); }} className="space-y-2"><label htmlFor={`reply-${th.id}`} className="ui-label">{t('yourReply')}</label><textarea id={`reply-${th.id}`} className="ui-input min-h-24" maxLength={4000} value={drafts[th.id] || ''} onChange={(e) => setDrafts((prev) => ({ ...prev, [th.id]: e.target.value }))} required /><button className="ui-button w-full" disabled={sending !== null || !drafts[th.id]?.trim()}>{sending === th.id ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}{t('sendReply')}</button></form></article>)}</div>}</>}
    {error && <p className="ui-alert" role="alert">{error}</p>}
  </div>;
}
