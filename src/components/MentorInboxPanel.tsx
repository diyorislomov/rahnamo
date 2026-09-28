'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Lock, LogIn, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface InboxThreadRow {
  id: string;
  questions_used: number;
  total_owed: number;
  payment_status: 'active' | 'awaiting_payment' | 'closed';
  soft_cap: number | null;
}

interface InboxMessageRow {
  id: string;
  thread_id: string;
  sender_role: 'student' | 'counselor';
  body: string;
  created_at: string;
}

// Stage 5: gated on the caller's own real mentor session now, not a
// shared passcode -- identity is resolved server-side from the session
// (see /api/threads/mentor-view and /api/threads/reply), so this always
// shows the logged-in mentor's OWN inbox, never anyone else's, regardless
// of which counselor's page it happens to be mounted on.
export default function MentorInboxPanel() {
  const t = useTranslations('textQa.inbox');

  const [checkingSession, setCheckingSession] = useState(true);
  const [isMentor, setIsMentor] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [threads, setThreads] = useState<InboxThreadRow[]>([]);
  const [messages, setMessages] = useState<InboxMessageRow[]>([]);
  const [drafts, setDrafts] = useState<{ [threadId: string]: string }>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<{ [threadId: string]: string }>({});

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function loadInbox() {
    const token = await getAccessToken();
    if (!token) return;

    const res = await fetch('/api/threads/mentor-view', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) {
      setLoadError(t('loadFailed'));
      return;
    }
    setLoadError('');
    setThreads(data.threads);
    setMessages(data.messages);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const isReal = !!data.session?.user && !data.session.user.is_anonymous;
      setIsMentor(isReal);
      setCheckingSession(false);
      if (isReal) loadInbox();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !session.user.is_anonymous) {
        setIsMentor(true);
        loadInbox();
      }
      if (event === 'SIGNED_OUT') {
        setIsMentor(false);
        setThreads([]);
        setMessages([]);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isMentor) return;
    pollRef.current = setInterval(loadInbox, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMentor]);

  const handleReply = async (threadId: string) => {
    const body = drafts[threadId]?.trim();
    if (!body) return;
    setSendingId(threadId);
    setSendError((prev) => ({ ...prev, [threadId]: '' }));

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/threads/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ threadId, body }),
      });
      const data = await res.json();
      if (!data.success) {
        setSendError((prev) => ({ ...prev, [threadId]: t('replyFailed') }));
        setSendingId(null);
        return;
      }
      setDrafts((prev) => ({ ...prev, [threadId]: '' }));
      await loadInbox();
    } catch (err) {
      console.error('[MENTOR_REPLY_FAILED]', err);
      setSendError((prev) => ({ ...prev, [threadId]: t('replyFailed') }));
    }
    setSendingId(null);
  };

  if (checkingSession) {
    return null;
  }

  if (!isMentor) {
    return (
      <div className="bg-white/95 rounded-3xl border border-amber-900/10 shadow-sm p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-amber-900 text-amber-100 flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-amber-300" />
        </div>
        <h3 className="font-serif font-bold text-sm text-amber-950">{t('title')}</h3>
        <Link
          href="/mentor/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3.5 py-2 rounded-xl border border-amber-300/60"
        >
          <LogIn className="w-3.5 h-3.5" /> {t('mentorSignInCta')}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white/95 rounded-3xl border border-amber-900/10 shadow-sm p-6 space-y-4">
      <h3 className="font-serif font-bold text-sm text-amber-950">{t('title')}</h3>

      {loadError && <p className="text-[11px] text-red-600 font-semibold">{loadError}</p>}

      {threads.length === 0 ? (
        <p className="text-xs text-stone-400">{t('noThreads')}</p>
      ) : (
        <div className="space-y-4">
          {threads.map((th) => {
            const threadMessages = messages.filter((m) => m.thread_id === th.id);
            return (
              <div key={th.id} className="border border-amber-900/10 rounded-2xl p-3 space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-amber-950">
                  <span>
                    {th.questions_used}
                    {th.soft_cap ? ` / ${th.soft_cap}` : ''}
                  </span>
                  <span>{th.total_owed.toLocaleString()} UZS</span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1.5">
                  {threadMessages.map((m) => (
                    <p key={m.id} className={`text-[11px] ${m.sender_role === 'counselor' ? 'text-amber-800' : 'text-stone-700'}`}>
                      <span className="font-bold">{m.sender_role === 'counselor' ? '↳ ' : ''}</span>
                      {m.body}
                    </p>
                  ))}
                </div>
                {th.payment_status === 'active' && (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={drafts[th.id] || ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [th.id]: e.target.value }))}
                      placeholder={t('replyPlaceholder')}
                      className="flex-1 p-2 text-[11px] bg-amber-50/40 border border-amber-900/15 rounded-lg outline-none focus:ring-2 focus:ring-amber-700"
                    />
                    <button
                      type="button"
                      onClick={() => handleReply(th.id)}
                      disabled={sendingId === th.id}
                      className="px-2.5 py-2 bg-amber-900 hover:bg-amber-800 text-amber-50 rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      {sendingId === th.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
                {sendError[th.id] && <p className="text-[10px] text-red-600">{sendError[th.id]}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
