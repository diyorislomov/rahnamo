'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Lock, Send, Loader2, CheckCircle2, LogIn, Clock, CreditCard, ExternalLink } from 'lucide-react';
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
  questions_paid: number;
  questions_used: number;
  total_paid: number;
  payment_method: 'click' | 'card';
  payment_status: 'pending_payment' | 'paid' | 'closed';
  payment_receipt: string | null;
  reply_deadline_at?: string | null;
  reply_status?: 'none' | 'pending_mentor_reply' | 'replied' | 'overdue' | 'refunded' | 'reassigned';
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
    questionsPaid: r.questions_paid ?? r.soft_cap ?? 1,
    questionsUsed: r.questions_used ?? 0,
    totalPaid: r.total_paid ?? 0,
    paymentMethod: r.payment_method ?? 'click',
    paymentStatus: r.payment_status,
    paymentReceipt: r.payment_receipt,
    replyDeadlineAt: r.reply_deadline_at,
    replyStatus: r.reply_status,
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

  // Pre-paid pack and method selection
  const defaultPackSize = counselor.softCap && counselor.softCap > 1 ? counselor.softCap : 3;
  const [selectedPack, setSelectedPack] = useState<number>(defaultPackSize);
  const [selectedMethod, setSelectedMethod] = useState<'click' | 'card'>('click');

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
        body: JSON.stringify({
          counselorId: counselor.id,
          packSize: selectedPack,
          paymentMethod: selectedMethod,
        }),
      });
      const result = await response.json();
      if (response.status === 409 && result.threadId) {
        await loadThread(result.threadId);
        setIsStarting(false);
        setPhase('thread');
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || 'start_failed');

      const mapped = mapThread(result.thread as QuestionThreadRow);
      setThread(mapped);
      setMessages([]);
      setIsStarting(false);
      setPhase('thread');

      // If Click was chosen and clickUrl was returned, open Click payment
      if (result.clickUrl) {
        window.location.href = result.clickUrl;
      }
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
      if (response.status === 402) {
        setAskError(data.error === 'pack_exhausted' ? t('thread.packExhausted') : t('thread.paymentRequiredError'));
      } else {
        setAskError(t('thread.askFailedGeneric'));
      }
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

  const pricePerQ = counselor.pricePerQuestion || 0;
  const totalPrice = pricePerQ * selectedPack;

  if (phase === 'start') {
    return (
      <div className="surface-card p-6 md:p-8 rounded-2xl space-y-5">
        <div>
          <span className="text-zinc-500 block text-[11px] font-mono uppercase tracking-wider mb-2 font-semibold">
            {t('start.packLabel')}
          </span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <button
              type="button"
              onClick={() => setSelectedPack(1)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPack === 1
                  ? 'border-[#0F4C5C] bg-[#0F4C5C]/5 shadow-xs ring-1 ring-[#0F4C5C]'
                  : 'border-zinc-900/10 bg-[#FFF8E7]/60 hover:bg-[#FFF8E7]'
              }`}
            >
              <span className="font-bold text-[#18181B] block">{t('start.singleQuestion')}</span>
              <span className="font-mono text-zinc-600 mt-1 block">{pricePerQ.toLocaleString()} UZS</span>
            </button>

            {defaultPackSize > 1 && (
              <button
                type="button"
                onClick={() => setSelectedPack(defaultPackSize)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedPack === defaultPackSize
                    ? 'border-[#0F4C5C] bg-[#0F4C5C]/5 shadow-xs ring-1 ring-[#0F4C5C]'
                    : 'border-zinc-900/10 bg-[#FFF8E7]/60 hover:bg-[#FFF8E7]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#18181B] block">{t('start.packQuestions', { count: defaultPackSize })}</span>
                  <span className="text-[10px] bg-[#D4A84B]/20 text-[#8B6E22] px-1.5 py-0.5 rounded font-semibold font-mono">Tavsiya</span>
                </div>
                <span className="font-mono text-zinc-600 mt-1 block">{(pricePerQ * defaultPackSize).toLocaleString()} UZS</span>
              </button>
            )}
          </div>
        </div>

        <div>
          <span className="text-zinc-500 block text-[11px] font-mono uppercase tracking-wider mb-2 font-semibold">
            {t('start.paymentMethodLabel')}
          </span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <button
              type="button"
              onClick={() => setSelectedMethod('click')}
              className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                selectedMethod === 'click'
                  ? 'border-[#0F4C5C] bg-[#0F4C5C]/5 ring-1 ring-[#0F4C5C] font-semibold text-[#0F4C5C]'
                  : 'border-zinc-900/10 bg-[#FFF8E7]/60 text-zinc-700 hover:bg-[#FFF8E7]'
              }`}
            >
              <CreditCard className="w-4 h-4 text-[#0F4C5C]" />
              <span>Click</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod('card')}
              className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                selectedMethod === 'card'
                  ? 'border-[#0F4C5C] bg-[#0F4C5C]/5 ring-1 ring-[#0F4C5C] font-semibold text-[#0F4C5C]'
                  : 'border-zinc-900/10 bg-[#FFF8E7]/60 text-zinc-700 hover:bg-[#FFF8E7]'
              }`}
            >
              <Lock className="w-4 h-4 text-[#D4A84B]" />
              <span>{t('start.methodCard')}</span>
            </button>
          </div>
        </div>

        <div className="bg-[#FFF8E7] p-3.5 rounded-xl border border-zinc-900/10 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-700">{t('start.totalPayable')}:</span>
          <span className="font-mono font-bold text-base text-[#0F4C5C]">{totalPrice.toLocaleString()} UZS</span>
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
          className="w-full py-3.5 bg-[#0F4C5C] hover:bg-[#09323D] text-white font-semibold text-sm rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          <span>{isStarting ? t('start.loading') : t('start.payAndStart')}</span>
        </button>
      </div>
    );
  }

  if (!thread) return null;

  const isPending = thread.paymentStatus === 'pending_payment';
  const isPaid = thread.paymentStatus === 'paid';
  const isClosed = thread.paymentStatus === 'closed';
  const isPackFull = thread.questionsUsed >= thread.questionsPaid;

  const clickCheckoutUrl = `https://my.click.uz/services/pay?service_id=${process.env.NEXT_PUBLIC_CLICK_SERVICE_ID || ''}&merchant_id=${process.env.NEXT_PUBLIC_CLICK_MERCHANT_ID || ''}&amount=${(thread.pricePerQuestion * thread.questionsPaid).toFixed(2)}&transaction_param=${thread.bookingId}&return_url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`;

  return (
    <div className="surface-card rounded-2xl flex flex-col max-h-[620px] overflow-hidden border border-zinc-900/10 shadow-xs">
      {/* Header with pack status */}
      <div className="px-4 py-3 border-b border-zinc-900/10 flex items-center justify-between text-xs font-mono font-semibold text-[#18181B] bg-[#FFF8E7]">
        <div className="flex items-center gap-2">
          <span>{t('thread.packStatus', { used: thread.questionsUsed, paid: thread.questionsPaid })}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold ${
              isPaid
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : isPending
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {isPaid ? t('thread.statusPaid') : isPending ? t('thread.statusPendingPayment') : t('thread.statusClosed')}
          </span>
        </div>
        <span className="text-[#0F4C5C]">
          {(thread.totalPaid > 0 ? thread.totalPaid : thread.pricePerQuestion * thread.questionsPaid).toLocaleString()} UZS
        </span>
      </div>

      {/* Messages */}
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

        {/* 48-hour response deadline notice if student just asked */}
        {isPaid && thread.replyStatus === 'pending_mentor_reply' && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium">
            <Clock className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>{t('thread.replyDeadlineNotice')}</span>
          </div>
        )}
      </div>

      {/* PAID STATE: Ask question input */}
      {isPaid && !isPackFull && (
        <div className="p-4 border-t border-zinc-900/10 space-y-2 bg-white">
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

      {/* PAID STATE: Pack exhausted */}
      {isPaid && isPackFull && (
        <div className="p-4 border-t border-zinc-900/10 space-y-2 bg-[#FFF8E7]/40 text-center">
          <p className="text-xs text-zinc-600 font-medium">{t('thread.packExhausted')}</p>
          <button
            type="button"
            onClick={handleStartNew}
            className="w-full py-2.5 bg-[#0F4C5C] hover:bg-[#09323D] text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            {t('thread.startNewButton')}
          </button>
        </div>
      )}

      {/* PENDING PAYMENT STATE */}
      {isPending && (
        <div className="p-4 border-t border-zinc-900/10 space-y-3 bg-white">
          <p className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
            {t('thread.paymentRequiredError')}
          </p>

          {thread.paymentMethod === 'click' ? (
            <div className="space-y-2">
              <a
                href={clickCheckoutUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-[#0F4C5C] hover:bg-[#09323D] text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4 text-[#D4A84B]" />
                <span>{t('thread.clickPayNow')}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          ) : (
            <>
              {thread.paymentReceipt ? (
                <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> {t('payment.submittedNotice')}
                </p>
              ) : (
                <>
                  <div className="p-3.5 bg-[#FFF8E7] border border-zinc-900/10 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-zinc-500 block">
                      {t('payment.cardBoxLabel')}
                    </span>
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
            </>
          )}
        </div>
      )}

      {/* CLOSED STATE */}
      {isClosed && (
        <div className="p-4 border-t border-zinc-900/10 space-y-2 bg-[#FFF8E7]/40">
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
