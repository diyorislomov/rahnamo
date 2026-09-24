'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { KeyRound, Send, Loader2 } from 'lucide-react';
import { Counselor } from '@/types';

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

// Passcode-gated, same shared secret forum replies already use -- entered
// once per page load and kept only in this component's own state, never
// persisted. Mirrors that same accepted tradeoff (one passcode for every
// mentor, not per-counselor auth), but unlike forum, nothing here is
// reachable without it: see /api/threads/mentor-view and
// /api/threads/reply for why the passcode is real enforcement this time,
// not just an app-layer speed bump in front of an open RLS policy.
export default function MentorInboxPanel({ counselor }: { counselor: Counselor }) {
  const t = useTranslations('textQa.inbox');

  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const [threads, setThreads] = useState<InboxThreadRow[]>([]);
  const [messages, setMessages] = useState<InboxMessageRow[]>([]);
  const [drafts, setDrafts] = useState<{ [threadId: string]: string }>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<{ [threadId: string]: string }>({});

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadInbox() {
    const res = await fetch('/api/threads/mentor-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counselorId: counselor.id, passcode }),
    });
    const data = await res.json();
    if (!data.success) {
      setUnlockError(t('invalidPasscode'));
      setUnlocked(false);
      return;
    }
    setThreads(data.threads);
    setMessages(data.messages);
  }

  const handleUnlock = async () => {
    setUnlockError('');
    await loadInbox();
    setUnlocked(true);
  };

  useEffect(() => {
    if (!unlocked) return;
    pollRef.current = setInterval(loadInbox, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  const handleReply = async (threadId: string) => {
    const body = drafts[threadId]?.trim();
    if (!body) return;
    setSendingId(threadId);
    setSendError((prev) => ({ ...prev, [threadId]: '' }));

    try {
      const res = await fetch('/api/threads/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, counselorId: counselor.id, body, passcode }),
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

  if (!unlocked) {
    return (
      <div className="bg-white/95 rounded-3xl border border-amber-900/10 shadow-sm p-6 space-y-3">
        <h3 className="font-serif font-bold text-sm text-amber-950 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-800" /> {t('title')}
        </h3>
        <div className="flex gap-2">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder={t('passcodeLabel')}
            className="flex-1 p-2.5 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
          />
          <button
            type="button"
            onClick={handleUnlock}
            className="px-4 py-2.5 bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold rounded-xl cursor-pointer"
          >
            {t('unlockButton')}
          </button>
        </div>
        {unlockError && <p className="text-[11px] text-red-600 font-semibold">{unlockError}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white/95 rounded-3xl border border-amber-900/10 shadow-sm p-6 space-y-4">
      <h3 className="font-serif font-bold text-sm text-amber-950 flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-amber-800" /> {t('title')}
      </h3>

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
