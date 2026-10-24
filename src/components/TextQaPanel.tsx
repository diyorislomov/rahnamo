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
    return <div className="p-8 text-center text-xs text-zinc-500">{t('start.loading')}</div>;
  }

  if (phase === 'login_required') {
    return (
      <div className="surface-card p-6 md:p-8 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[#0F4C5C] text-white flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-5 h-5 text-[#D4A84B]" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-lg text-[#18181B]">{t('start.loginRequiredTitle')}</h3>
          <p className="text-xs text-zinc-500 mt-1">{t('start.loginRequiredSubtitle')}</p>
        </div>
        <Link
          href={`/login?redirect=${encodeURIComponent(`/counselors/${counselor.id}`)}`}
          className="inline-flex items-center gap-2 bg-[#0F4C5C] hover:bg-[#09323D] text-white font-semibold text-xs px-5 py-3 rounded-xl shadow-sm transition-colors"
        >
          <LogIn className="w-4 h-4 text-[#D4A84B]" /> {t('start.loginRequiredCta')}
        </Link>
      </div>
    );
  }

  if (phase === 'start') {
    return (
      <div className="surface-card p-6 md:p-8 rounded-2xl space-y-5">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#FFF8E7] p-3.5 rounded-xl border border-zinc-900/10">
            <span className="text-zinc-500 block text-[10px] font-mono uppercase tracking-wider">{t('start.priceLabel')}</span>
            <span className="font-mono font-bold text-[#18181B] mt-0.5 block">{counselor.pricePerQuestion?.toLocaleString()} UZS</span>
          </div>
          <div className="bg-[#FFF8E7] p-3.5 rounded-xl border border-zinc-900/10">
            <span className="text-zinc-500 block text-[10px] font-mono uppercase tracking-wider">{t('start.capLabel')}</span>
            <span className="font-mono font-bold text-[#18181B] mt-0.5 block">
              {counselor.softCap ? counselor.softCap : t('start.noCapNote')}
            </span>
          </div>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#0F4C5C] cursor-pointer"
          />
          <span className="text-xs text-zinc-700">{t('start.ageCheckboxLabel')}</span>
        </label>

        {startError && (
          <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
            {startError}
          </p>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={isStarting || !ageConfirmed}
          className="w-full py-3.5 bg-[#0F4C5C] hover:bg-[#09323D] text-white font-semibold text-sm rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          {isStarting ? t('start.loading') : t('start.beginButton')}
        </button>
      </div>
    );
  }

  if (!thread) return null;

  return (
    <div className="surface-card rounded-2xl flex flex-col max-h-[600px] overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-900/10 flex items-center justify-between text-xs font-mono font-semibold text-[#18181B] bg-[#FFF8E7]">
        <span>
          {thread.softCap
            ? t('thread.questionsLabelWithCap', { used: thread.questionsUsed, cap: thread.softCap })
            : t('thread.questionsLabel', { used: thread.questionsUsed })}
        </span>
        <span className="text-[#0F4C5C]">{t('thread.totalLabel', { amount: thread.totalOwed.toLocaleString() })}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px]">
        {messages.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-6">{t('thread.noMessagesYet')}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderRole === 'student' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs ${
                  m.senderRole === 'student'
                    ? 'bg-[#0F4C5C] text-white'
                    : 'bg-[#FFF8E7] text-[#18181B] border border-zinc-900/10'
                }`}
              >
                <span className="block text-[10px] opacity-70 mb-0.5 font-mono">
                  {m.senderRole === 'student' ? t('thread.studentLabel') : t('thread.counselorLabel')}
                </span>
                {m.body}
              </div>
            </div>
          ))
        )}
      </div>

      {thread.paymentStatus === 'active' && (
        <div className="p-4 border-t border-zinc-900/10 space-y-2">
          {askError && <p className="text-xs text-red-600 font-medium">{askError}</p>}
          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              maxLength={4000}
              placeholder={t('thread.askPlaceholder')}
              className="flex-1 px-3.5 py-2.5 text-xs bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
            />
            <button
              type="button"
              onClick={handleAsk}
              disabled={isAsking}
              className="px-4 py-2.5 bg-[#0F4C5C] hover:bg-[#09323D] text-white rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="text-xs font-semibold">{t('thread.askButton')}</span>
            </button>
          </div>
        </div>
      )}

      {thread.paymentStatus === 'awaiting_payment' && (
        <div className="p-4 border-t border-zinc-900/10 space-y-3">
          <p className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
            {t('thread.awaitingPaymentNotice')}
          </p>

          {thread.paymentReceipt ? (
            <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {t('payment.submittedNotice')}
            </p>
          ) : (
            <>
              <div className="p-3.5 bg-[#FFF8E7] border border-zinc-900/10 rounded-xl space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-zinc-500 block">{t('payment.cardBoxLabel')}</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-[#18181B]">
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
                    className="text-xs font-semibold text-[#0F4C5C] underline hover:text-[#09323D] cursor-pointer disabled:opacity-40"
                  >
                    {copiedCard ? t('payment.copiedButton') : t('payment.copyButton')}
                  </button>
                </div>
                <span className="text-[11px] text-zinc-500 block">
                  {isPaymentConfigured ? paymentCardOwner : t('payment.unavailableHint')}
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1">{t('payment.receiptLabel')}</label>
                <input
                  type="text"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  maxLength={300}
                  placeholder={t('payment.receiptPlaceholder')}
                  className="w-full px-3 py-2 bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl text-xs outline-none focus:bg-white focus:border-[#0F4C5C]"
                />
                {receiptError && <p className="text-xs text-red-600 mt-1">{receiptError}</p>}
              </div>

              <button
                type="button"
                onClick={handleSubmitReceipt}
                disabled={isSubmittingReceipt || !receiptRef.trim() || !isPaymentConfigured}
                className="w-full py-3 bg-[#0F4C5C] hover:bg-[#09323D] text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5 text-[#D4A84B]" />
                {t('payment.submitButton')}
              </button>
            </>
          )}
        </div>
      )}

      {thread.paymentStatus === 'closed' && (
        <div className="p-4 border-t border-zinc-900/10 space-y-2">
          <p className="text-xs text-zinc-600">{t('thread.closedNotice')}</p>
          <button
            type="button"
            onClick={handleStartNew}
            className="w-full py-3 bg-[#0F4C5C] hover:bg-[#09323D] text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            {t('thread.startNewButton')}
          </button>
        </div>
      )}
    </div>
  );
}
