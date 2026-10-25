'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Lock, LogIn, Send, Loader2 } from 'lucide-react';
import { watchMentorSession } from '@/lib/mentorClient';

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

  async function loadInbox(): Promise<boolean> {
    try {
      const res = await fetch('/api/threads/mentor-view', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.status === 401) {
        setIsMentor(false);
        return false;
      }
      if (!res.ok || !data.success) throw new Error(data.error || 'load_failed');
      setIsMentor(true);
      setLoadError('');
      setThreads(data.threads);
      setMessages(data.messages);
      return true;
    } catch (error) {
      console.error('[MENTOR_INBOX_LOAD_FAILED]', error);
      setLoadError(t('loadFailed'));
      return false;
    }
  }

  useEffect(() => watchMentorSession(session => {
    if(session) void loadInbox();
    else {setIsMentor(false);setThreads([]);setMessages([]);}
    setCheckingSession(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }),[]);

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
      const res = await fetch('/api/threads/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      <div className="surface-card rounded-2xl p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-[#0F4C5C] text-white flex items-center justify-center mx-auto">
          <Lock className="w-4 h-4 text-[#D4A84B]" />
        </div>
        <h3 className="font-serif font-bold text-sm text-[#18181B]">{t('title')}</h3>
        <Link
          href="/mentor/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/8 hover:bg-[#0F4C5C]/15 px-3.5 py-2 rounded-xl border border-[#0F4C5C]/15 transition-colors"
        >
          <LogIn className="w-3.5 h-3.5" /> {t('mentorSignInCta')}
        </Link>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-2xl p-6 space-y-4">
      <h3 className="font-serif font-bold text-sm text-[#18181B]">{t('title')}</h3>

      {loadError && <p className="text-xs text-red-600 font-medium">{loadError}</p>}

      {threads.length === 0 ? (
        <p className="text-xs text-zinc-400">{t('noThreads')}</p>
      ) : (
        <div className="space-y-3.5">
          {threads.map((th) => {
            const threadMessages = messages.filter((m) => m.thread_id === th.id);
            return (
              <div key={th.id} className="border border-zinc-900/10 bg-[#FFF8E7]/50 rounded-xl p-3.5 space-y-2.5">
                <div className="flex justify-between text-xs font-mono font-semibold text-[#18181B]">
                  <span>
                    {th.questions_used}
                    {th.soft_cap ? ` / ${th.soft_cap}` : ''}
                  </span>
                  <span className="text-[#0F4C5C]">{th.total_owed.toLocaleString()} UZS</span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1.5">
                  {threadMessages.map((m) => (
                    <p key={m.id} className={`text-xs ${m.sender_role === 'counselor' ? 'text-[#0F4C5C] font-medium' : 'text-zinc-700'}`}>
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
                      maxLength={4000}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [th.id]: e.target.value }))}
                      placeholder={t('replyPlaceholder')}
                      className="flex-1 px-2.5 py-2 text-xs bg-white border border-zinc-900/12 rounded-lg outline-none focus:border-[#0F4C5C]"
                    />
                    <button
                      type="button"
                      onClick={() => handleReply(th.id)}
                      disabled={sendingId === th.id}
                      className="px-3 py-2 bg-[#0F4C5C] hover:bg-[#09323D] text-white rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {sendingId === th.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
                {sendError[th.id] && <p className="text-[11px] text-red-600">{sendError[th.id]}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
