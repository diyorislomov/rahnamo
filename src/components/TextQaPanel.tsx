'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Lock, Send, Loader2, CheckCircle2, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Counselor, QuestionThread, ThreadMessage } from '@/types';
import { isPaymentConfigured, paymentCardDigits, paymentCardDisplay, paymentCardOwner } from '@/lib/paymentConfig';

interface QuestionThreadRow {
  id: string;
  booking_id: string;
  counselor_id: string;
  student_auth_id: string;
  device_id: string;
  price_per_question: number;
  soft_cap: number | null;
  questions_used: number;
  total_owed: number;
  payment_status: 'active' | 'awaiting_payment' | 'closed';
  payment_receipt: string | null;
  age_confirmed_at: string;
  created_at: string;
  closed_at: string | null;
}

function mapThread(r: QuestionThreadRow): QuestionThread {
  return {
    id: r.id,
    bookingId: r.booking_id,
    counselorId: r.counselor_id,
    studentAuthId: r.student_auth_id,
    deviceId: r.device_id,
    pricePerQuestion: r.price_per_question,
    softCap: r.soft_cap,
    questionsUsed: r.questions_used,
    totalOwed: r.total_owed,
    paymentStatus: r.payment_status,
    paymentReceipt: r.payment_receipt,
    ageConfirmedAt: r.age_confirmed_at,
    createdAt: r.created_at,
    closedAt: r.closed_at,
  };
}

export default function TextQaPanel({ counselor }: { counselor: Counselor }) {
  const t = useTranslations('textQa');
  const { status: sessionStatus } = useSession();

  const [phase, setPhase] = useState<'checking' | 'login_required' | 'start' | 'thread'>('checking');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [startError, setStartError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const [thread, setThread] = useState<QuestionThread | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [askError, setAskError] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const [receiptRef, setReceiptRef] = useState('');
  const [copiedCard, setCopiedCard] = useState(false);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadThread(threadId: string) {
    const response = await fetch(`/api/threads?threadId=${encodeURIComponent(threadId)}`);
    const result = await response.json();
    const threadRow = result.thread as QuestionThreadRow | null;
    const msgRows = result.messages as Array<{ id: string; thread_id: string; sender_role: 'student' | 'counselor'; body: string; created_at: string }>;
    if (threadRow) setThread(mapThread(threadRow as QuestionThreadRow));
    if (Array.isArray(msgRows)) {
      setMessages(
        msgRows.map((m) => ({ id: m.id, threadId: m.thread_id, senderRole: m.sender_role, body: m.body, createdAt: m.created_at }))
      );
    }
  }

  // Stage 4: mentee login is mandatory here too now -- no more anonymous
  // sign-in fallback. A visitor with no real session (or a leftover
  // pre-migration anonymous one) sees the login gate below instead of
  // ever reaching 'start'. Real sessions still get looked up against any
  // existing thread on mount, same as before.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionStatus === 'loading') return;
      if (sessionStatus !== 'authenticated') {
        if (!cancelled) setPhase('login_required');
        return;
      }
      const response = await fetch(`/api/threads?counselorId=${encodeURIComponent(counselor.id)}`);
      const result = await response.json();
      const data = result.thread as QuestionThreadRow | null;

      if (cancelled) return;
      if (data) {
        setThread(mapThread(data as QuestionThreadRow));
        await loadThread(data.id);
        setPhase('thread');
      } else {
        setPhase('start');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [counselor.id, sessionStatus]);

  // Polling, not Realtime -- consistent with the rest of this app, which
  // uses no websocket subscriptions anywhere. Refetches while the thread
  // view is open; stops the instant it isn't.
  useEffect(() => {
    if (phase !== 'thread' || !thread) return;
    pollRef.current = setInterval(() => {
      loadThread(thread.id);
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, thread?.id]);

  const handleStart = async () => {
    if (!ageConfirmed) {
      setStartError(t('start.ageRequiredError'));
      return;
    }
    setIsStarting(true);
    setStartError('');

    try {
      const response = await fetch('/api/threads/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counselorId: counselor.id }),
      });
      const result = await response.json();
      if (response.status === 409 && result.threadId) {
        await loadThread(result.threadId);
        setIsStarting(false);
        setPhase('thread');
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || 'start_failed');
      setThread(mapThread(result.thread as QuestionThreadRow));
      setMessages([]);
      setIsStarting(false);
      setPhase('thread');
    } catch (err) {
      console.error('[TEXT_QA_START_FAILED]', err);
      setIsStarting(false);
      setStartError(t('start.startFailed'));
    }
  };

  const handleAsk = async () => {
    if (!thread) return;
    if (!newQuestion.trim() || newQuestion.trim().length > 4000) {
      setAskError(t('thread.askFailedEmpty'));
      return;
    }
    setIsAsking(true);
    setAskError('');

    const response = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ask', threadId: thread.id, body: newQuestion.trim() }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      console.error('[TEXT_QA_ASK_FAILED]', data);
      setAskError(t('thread.askFailedGeneric'));
      setIsAsking(false);
      return;
    }

    setNewQuestion('');
    await loadThread(thread.id);
    setIsAsking(false);
  };

  const handleSubmitReceipt = async () => {
    if (!thread) return;
    setIsSubmittingReceipt(true);
    setReceiptError('');

    const response = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'receipt', threadId: thread.id, receipt: receiptRef.trim() }),
    });
    if (!response.ok) {
      console.error('[TEXT_QA_RECEIPT_SUBMIT_FAILED]');
      setReceiptError(t('thread.askFailedGeneric'));
      setIsSubmittingReceipt(false);
      return;
    }

    await loadThread(thread.id);
    setIsSubmittingReceipt(false);
  };

  const handleStartNew = () => {
    setThread(null);
    setMessages([]);
    setReceiptRef('');
    setPhase('start');
  };

  if (phase === 'checking') {
    return <div className="p-8 text-center text-xs text-stone-500">{t('start.loading')}</div>;
  }

  if (phase === 'login_required') {
    return (
      <div className="bg-white/95 p-6 md:p-8 rounded-3xl border border-amber-900/10 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-7 h-7 text-amber-300" />
        </div>
        <div>
          <h3 className="font-serif font-extrabold text-lg text-amber-950">{t('start.loginRequiredTitle')}</h3>
          <p className="text-xs text-stone-600 mt-1.5">{t('start.loginRequiredSubtitle')}</p>
        </div>
        <Link
          href={`/login?redirect=${encodeURIComponent(`/counselors/${counselor.id}`)}`}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-xs px-6 py-3 rounded-2xl shadow-md transition-all"
        >
          <LogIn className="w-4 h-4 text-amber-300" /> {t('start.loginRequiredCta')}
        </Link>
      </div>
    );
  }

  if (phase === 'start') {
    return (
      <div className="bg-white/95 p-6 md:p-8 rounded-3xl border border-amber-900/10 shadow-sm space-y-5">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-900/10">
            <span className="text-stone-400 block text-[10px]">{t('start.priceLabel')}</span>
            <span className="font-bold text-amber-950">{counselor.pricePerQuestion?.toLocaleString()} UZS</span>
          </div>
          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-900/10">
            <span className="text-stone-400 block text-[10px]">{t('start.capLabel')}</span>
            <span className="font-bold text-amber-950">
              {counselor.softCap ? counselor.softCap : t('start.noCapNote')}
            </span>
          </div>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-amber-800 cursor-pointer"
          />
          <span className="text-xs text-stone-700">{t('start.ageCheckboxLabel')}</span>
        </label>

        {startError && (
          <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-300 rounded-xl px-3.5 py-2.5">
            {startError}
          </p>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={isStarting || !ageConfirmed}
          className="w-full py-4 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          {isStarting ? t('start.loading') : t('start.beginButton')}
        </button>
      </div>
    );
  }

  if (!thread) return null;

  return (
    <div className="bg-white/95 rounded-3xl border border-amber-900/10 shadow-sm flex flex-col max-h-[600px]">
      <div className="p-4 border-b border-amber-900/10 flex items-center justify-between text-xs font-bold text-amber-950 bg-amber-50/60 rounded-t-3xl">
        <span>
          {thread.softCap
            ? t('thread.questionsLabelWithCap', { used: thread.questionsUsed, cap: thread.softCap })
            : t('thread.questionsLabel', { used: thread.questionsUsed })}
        </span>
        <span>{t('thread.totalLabel', { amount: thread.totalOwed.toLocaleString() })}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px]">
        {messages.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-6">{t('thread.noMessagesYet')}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderRole === 'student' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs ${
                  m.senderRole === 'student'
                    ? 'bg-amber-900 text-amber-50'
                    : 'bg-amber-50 text-stone-800 border border-amber-900/10'
                }`}
              >
                <span className="block text-[10px] opacity-70 mb-0.5">
                  {m.senderRole === 'student' ? t('thread.studentLabel') : t('thread.counselorLabel')}
                </span>
                {m.body}
              </div>
            </div>
          ))
        )}
      </div>

      {thread.paymentStatus === 'active' && (
        <div className="p-4 border-t border-amber-900/10 space-y-2">
          {askError && <p className="text-[11px] text-red-600 font-semibold">{askError}</p>}
          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              maxLength={4000}
              placeholder={t('thread.askPlaceholder')}
              className="flex-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
            />
            <button
              type="button"
              onClick={handleAsk}
              disabled={isAsking}
              className="px-4 py-3 bg-amber-900 hover:bg-amber-800 text-amber-50 rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="text-xs font-bold">{t('thread.askButton')}</span>
            </button>
          </div>
        </div>
      )}

      {thread.paymentStatus === 'awaiting_payment' && (
        <div className="p-4 border-t border-amber-900/10 space-y-3">
          <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-xl px-3.5 py-2.5">
            {t('thread.awaitingPaymentNotice')}
          </p>

          {thread.paymentReceipt ? (
            <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {t('payment.submittedNotice')}
            </p>
          ) : (
            <>
              <div className="p-3.5 bg-amber-100/70 border border-amber-300 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-900 block">{t('payment.cardBoxLabel')}</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-extrabold text-sm text-amber-950">
                    {isPaymentConfigured ? paymentCardDisplay : t('payment.unavailable')}
                  </span>
                  <button
                    type="button"
                    disabled={!isPaymentConfigured}
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && isPaymentConfigured) {
                        navigator.clipboard.writeText(paymentCardDigits);
                        setCopiedCard(true);
                        setTimeout(() => setCopiedCard(false), 2000);
                      }
                    }}
                    className="text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer disabled:opacity-40"
                  >
                    {copiedCard ? t('payment.copiedButton') : t('payment.copyButton')}
                  </button>
                </div>
                <span className="text-[10px] text-stone-600 block">
                  {isPaymentConfigured ? paymentCardOwner : t('payment.unavailableHint')}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">{t('payment.receiptLabel')}</label>
                <input
                  type="text"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  maxLength={300}
                  placeholder={t('payment.receiptPlaceholder')}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                />
                {receiptError && <p className="text-[11px] text-red-600 mt-1">{receiptError}</p>}
              </div>

              <button
                type="button"
                onClick={handleSubmitReceipt}
                disabled={isSubmittingReceipt || !receiptRef.trim() || !isPaymentConfigured}
                className="w-full py-3 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                {t('payment.submitButton')}
              </button>
            </>
          )}
        </div>
      )}

      {thread.paymentStatus === 'closed' && (
        <div className="p-4 border-t border-amber-900/10 space-y-2">
          <p className="text-xs text-stone-600">{t('thread.closedNotice')}</p>
          <button
            type="button"
            onClick={handleStartNew}
            className="w-full py-3 bg-amber-900 hover:bg-amber-800 text-amber-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            {t('thread.startNewButton')}
          </button>
        </div>
      )}
    </div>
  );
}
