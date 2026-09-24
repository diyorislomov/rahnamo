'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';
import { ensureStudentAuth } from '@/lib/threadAuth';
import { Counselor, QuestionThread, ThreadMessage } from '@/types';

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

const CENTRAL_CARD_NUMBER = '8600 5555 4444 3333';
const CENTRAL_CARD_DIGITS = '8600555544443333';

export default function TextQaPanel({ counselor }: { counselor: Counselor }) {
  const t = useTranslations('textQa');

  const [phase, setPhase] = useState<'checking' | 'start' | 'thread'>('checking');
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
    const [{ data: threadRow }, { data: msgRows }] = await Promise.all([
      supabase.from('question_threads').select('*').eq('id', threadId).single(),
      supabase.from('thread_messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: true }),
    ]);
    if (threadRow) setThread(mapThread(threadRow as QuestionThreadRow));
    if (msgRows) {
      setMessages(
        msgRows.map((m) => ({ id: m.id, threadId: m.thread_id, senderRole: m.sender_role, body: m.body, createdAt: m.created_at }))
      );
    }
  }

  // On mount: only ever looks for a thread that could already exist for
  // THIS browser's own already-persisted anonymous session -- never
  // triggers a fresh sign-in just to check, so a first-time visitor never
  // gets an auth.users row created before they've actually chosen to
  // start anything.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        if (!cancelled) setPhase('start');
        return;
      }
      const { data } = await supabase
        .from('question_threads')
        .select('*')
        .eq('counselor_id', counselor.id)
        .eq('student_auth_id', uid)
        .neq('payment_status', 'closed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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
  }, [counselor.id]);

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

    let studentAuthId: string;
    try {
      studentAuthId = await ensureStudentAuth();
    } catch (err) {
      console.error('[TEXT_QA_AUTH_FAILED]', err);
      setIsStarting(false);
      setStartError(t('start.authFailed'));
      return;
    }

    const bookingId = `RNM-TXT-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error: bookingError } = await supabase.from('bookings').insert({
      id: bookingId,
      device_id: getDeviceId(),
      counselor_id: counselor.id,
      counselor_name: counselor.fullName,
      counselor_headline: counselor.headline,
      counselor_avatar: counselor.avatarUrl,
      tier: 'text_qa',
      price: 0,
      payment_method: 'payme',
      slot: "Ochiq matnli maslahat",
      student_name: '(Matnli maslahat)',
      email: '',
      phone: '',
      telegram: '',
      education: '',
      question: '(Matnli maslahat orqali)',
    });

    if (bookingError) {
      console.error('[TEXT_QA_BOOKING_INSERT_FAILED]', bookingError);
      setIsStarting(false);
      setStartError(t('start.startFailed'));
      return;
    }

    const { data: threadRow, error: threadError } = await supabase
      .from('question_threads')
      .insert({
        booking_id: bookingId,
        counselor_id: counselor.id,
        student_auth_id: studentAuthId,
        device_id: getDeviceId(),
        age_confirmed_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (threadError || !threadRow) {
      console.error('[TEXT_QA_THREAD_INSERT_FAILED]', threadError);
      setIsStarting(false);
      setStartError(t('start.startFailed'));
      return;
    }

    setThread(mapThread(threadRow as QuestionThreadRow));
    setMessages([]);
    setIsStarting(false);
    setPhase('thread');
  };

  const handleAsk = async () => {
    if (!thread) return;
    if (!newQuestion.trim()) {
      setAskError(t('thread.askFailedEmpty'));
      return;
    }
    setIsAsking(true);
    setAskError('');

    const { data, error } = await supabase.rpc('ask_thread_question', {
      p_thread_id: thread.id,
      p_body: newQuestion.trim(),
    });

    if (error || !data?.success) {
      console.error('[TEXT_QA_ASK_FAILED]', error, data);
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

    const { error } = await supabase
      .from('question_threads')
      .update({ payment_receipt: receiptRef.trim() })
      .eq('id', thread.id);

    if (error) {
      console.error('[TEXT_QA_RECEIPT_SUBMIT_FAILED]', error);
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
                  <span className="font-mono font-extrabold text-sm text-amber-950">{CENTRAL_CARD_NUMBER}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined') {
                        navigator.clipboard.writeText(CENTRAL_CARD_DIGITS);
                        setCopiedCard(true);
                        setTimeout(() => setCopiedCard(false), 2000);
                      }
                    }}
                    className="text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                  >
                    {copiedCard ? t('payment.copiedButton') : t('payment.copyButton')}
                  </button>
                </div>
                <span className="text-[10px] text-stone-600 block">{t('payment.cardOwnerLabel')}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">{t('payment.receiptLabel')}</label>
                <input
                  type="text"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  placeholder={t('payment.receiptPlaceholder')}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                />
                {receiptError && <p className="text-[11px] text-red-600 mt-1">{receiptError}</p>}
              </div>

              <button
                type="button"
                onClick={handleSubmitReceipt}
                disabled={isSubmittingReceipt || !receiptRef.trim()}
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
