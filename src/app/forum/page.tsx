'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import { mapForumQuestion, mapForumAnswer } from '@/lib/forum';
import { ForumQuestion, ForumAnswer } from '@/types';
import {
  MessageCircleQuestion,
  Send,
  ChevronDown,
  AlertCircle,
  ShieldCheck,
  UserRound,
  LogIn,
} from 'lucide-react';

const CATEGORY_KEYS = Object.keys(SPECIALTY_CONFIG).filter((k) => k !== 'All');

export default function ForumPage() {
  const t = useTranslations('forum');
  const tSpecialties = useTranslations('specialties');
  const [questions, setQuestions] = useState<ForumQuestion[]>([]);
  const [answers, setAnswers] = useState<ForumAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Ask-a-question form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState(CATEGORY_KEYS[0]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Inline "answer this" mini-forms, keyed by question id
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<{ [questionId: string]: string }>({});
  const [answerErrors, setAnswerErrors] = useState<{ [questionId: string]: string }>({});

  // Stage 5: identity comes from the caller's real mentor session now,
  // never a counselor picked from a dropdown plus a shared passcode --
  // that let anyone answer as any mentor. Resolved once for the whole
  // page; /api/forum/answer independently re-verifies this server-side
  // and never trusts anything the client sends.
  const [checkingMentorSession, setCheckingMentorSession] = useState(true);
  const [mentorSession, setMentorSession] = useState<{ fullName: string } | null>(null);

  useEffect(() => {
    async function loadMentorSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user || user.is_anonymous) {
        setMentorSession(null);
        setCheckingMentorSession(false);
        return;
      }
      const response = await fetch('/api/mentor/profile', {
        headers: { Authorization: `Bearer ${data.session?.access_token}` },
      });
      const result = await response.json();
      setMentorSession(response.ok && result.success ? { fullName: result.counselor.full_name } : null);
      setCheckingMentorSession(false);
    }
    loadMentorSession();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadMentorSession();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadData = useCallback(() => {
    fetch('/api/forum/questions')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'query_failed');
        setQuestions((result.questions || []).map(mapForumQuestion));
        setAnswers((result.answers || []).map(mapForumAnswer));
        setLoadError('');
      })
      .catch((error) => {
        console.error('[FORUM_LIST_FAILED]', error);
        setQuestions([]);
        setAnswers([]);
        setLoadError(t('submitError'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const validateQuestion = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim() || title.trim().length < 5) {
      newErrors.title = t('validation.title');
    }
    if (!body.trim() || body.trim().length < 10) {
      newErrors.body = t('validation.body');
    }
    if (!isAnonymous && (!name.trim() || name.trim().length < 2)) {
      newErrors.name = t('validation.name');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = t('validation.email');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateQuestion()) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/forum/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, category, title, body, isAnonymous }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'insert_failed');
      setQuestions((prev) => [mapForumQuestion(result.question), ...prev]);
    } catch (error) {
      console.error('[FORUM_QUESTION_INSERT_FAILED]', error);
      setSubmitting(false);
      setSubmitError(t('submitError'));
      return;
    }
    setTitle('');
    setBody('');
    setName('');
    setEmail('');
    setIsAnonymous(false);
    setErrors({});
    setSubmitting(false);
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 4000);
  };

  const handleSubmitAnswer = async (questionId: string) => {
    const draftBody = answerDrafts[questionId]?.trim();
    if (!draftBody || draftBody.length < 5) {
      setAnswerErrors((prev) => ({
        ...prev,
        [questionId]: t('answer.validationError'),
      }));
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setAnswerErrors((prev) => ({ ...prev, [questionId]: t('answer.saveError') }));
      return;
    }

    const res = await fetch('/api/forum/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ questionId, body: draftBody }),
    });
    const result = await res.json();

    if (!result.success) {
      setAnswerErrors((prev) => ({ ...prev, [questionId]: t('answer.saveError') }));
      return;
    }

    const newAnswer: ForumAnswer = { ...result.answer, counselorName: mentorSession?.fullName };

    setAnswers((prev) => [...prev, newAnswer]);
    setAnswerDrafts((prev) => ({ ...prev, [questionId]: '' }));
    setAnswerErrors((prev) => ({ ...prev, [questionId]: '' }));
    setAnsweringId(null);
  };

  const sortedQuestions = [...questions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/10 border border-amber-900/15 text-amber-950 text-xs font-bold mb-3">
            <MessageCircleQuestion className="w-4 h-4 text-amber-800" />
            <span>{t('badge')}</span>
          </div>
          <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-amber-950">
            {t('heading')}
          </h1>
          <p className="text-xs text-stone-600 mt-2 max-w-xl mx-auto">
            {t('subheading')}
          </p>
        </div>

        {/* Ask a question */}
        <form
          onSubmit={handleSubmitQuestion}
          className="bg-white/95 rounded-3xl border border-amber-900/15 shadow-sm p-6 sm:p-8 space-y-4 mb-10"
        >
          <h2 className="font-serif text-lg font-bold text-amber-950">{t('askForm.heading')}</h2>

          <div>
            <label htmlFor="forum-title" className="text-xs font-semibold text-stone-700 block">
              {t('askForm.titleLabel')}
            </label>
            <input
              id="forum-title"
              type="text"
              maxLength={160}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder={t('askForm.titlePlaceholder')}
              className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                errors.title ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
              }`}
            />
            {errors.title && <p className="text-[11px] text-red-600 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="forum-category" className="text-xs font-semibold text-stone-700 block">
              {t('askForm.categoryLabel')}
            </label>
            <select
              id="forum-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700 text-stone-800 cursor-pointer"
            >
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SPECIALTY_CONFIG[key].icon} {tSpecialties(key)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="forum-body" className="text-xs font-semibold text-stone-700 block">
              {t('askForm.bodyLabel')}
            </label>
            <textarea
              id="forum-body"
              rows={4}
              maxLength={4000}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (errors.body) setErrors((prev) => ({ ...prev, body: '' }));
              }}
              placeholder={t('askForm.bodyPlaceholder')}
              className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                errors.body ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
              }`}
            />
            {errors.body && <p className="text-[11px] text-red-600 mt-1">{errors.body}</p>}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="forum-anonymous"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="accent-amber-800 cursor-pointer"
            />
            <label htmlFor="forum-anonymous" className="text-xs font-semibold text-stone-700 cursor-pointer">
              {t('askForm.anonymousLabel')}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isAnonymous && (
              <div>
                <label htmlFor="forum-name" className="text-xs font-semibold text-stone-700 block">
                  {t('askForm.nameLabel')}
                </label>
                <input
                  id="forum-name"
                  type="text"
                  maxLength={80}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder={t('askForm.namePlaceholder')}
                  className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                    errors.name ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                  }`}
                />
                {errors.name && <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>}
              </div>
            )}

            <div className={isAnonymous ? 'sm:col-span-2' : ''}>
              <label htmlFor="forum-email" className="text-xs font-semibold text-stone-700 block">
                {t('askForm.emailLabel')}
              </label>
              <input
                id="forum-email"
                type="email"
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder={t('askForm.emailPlaceholder')}
                className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                  errors.email ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                }`}
              />
              {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
              <p className="text-[10px] text-stone-400 mt-1">
                {t('askForm.emailPrivacyNote')}
              </p>
            </div>
          </div>

          {submitError && (
            <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-300 rounded-xl px-3.5 py-2.5 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? t('askForm.submitting') : t('askForm.submit')}</span>
          </button>

          {justSubmitted && (
            <p className="text-[11px] text-emerald-700 font-semibold text-center">
              {t('askForm.successNote')}
            </p>
          )}
        </form>

        {/* Question list */}
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-bold text-amber-950 flex items-center gap-2">
            <span>{t('recentQuestionsHeading')}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-mono">
              {sortedQuestions.length}
            </span>
          </h2>

          {loading ? (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
              <p className="text-xs text-stone-500">{t('loadingQuestions')}</p>
            </div>
          ) : loadError ? (
            <div className="bg-red-50 rounded-3xl p-8 text-center border border-red-200 shadow-xs">
              <p className="text-xs font-semibold text-red-700">{loadError}</p>
            </div>
          ) : sortedQuestions.length === 0 ? (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
              <MessageCircleQuestion className="w-10 h-10 text-stone-400 mx-auto mb-3" />
              <h4 className="font-serif font-bold text-base text-amber-950">{t('emptyTitle')}</h4>
              <p className="text-xs text-stone-500 mt-1">{t('emptyBody')}</p>
            </div>
          ) : (
            sortedQuestions.map((q) => {
              const questionAnswers = answers.filter((a) => a.questionId === q.id);
              const cfg = SPECIALTY_CONFIG[q.category];
              const isAnswering = answeringId === q.id;
              const draftBody = answerDrafts[q.id] || '';

              return (
                <div key={q.id} className="bg-white/95 rounded-3xl border border-amber-900/15 shadow-sm p-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    {cfg && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.inactiveClass}`}>
                        {cfg.icon} {tSpecialties(q.category)}
                      </span>
                    )}
                    <span className="text-[10px] text-stone-400 flex items-center gap-1">
                      <UserRound className="w-3 h-3" />
                      {q.studentNameOrAnonymous}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-amber-950 mt-2">{q.title}</h3>
                  <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{q.body}</p>

                  {/* Answers */}
                  {questionAnswers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-amber-900/10 space-y-3">
                      {questionAnswers.map((a) => {
                        return (
                          <div key={a.id} className="bg-amber-50/60 border border-amber-900/10 rounded-xl p-3.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 fill-amber-100" />
                              <span>{a.counselorName || t('defaultResponderName')}</span>
                            </div>
                            <p className="text-xs text-stone-700 mt-1.5 leading-relaxed">{a.body}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Answer this */}
                  <div className="mt-4 pt-3 border-t border-amber-900/10">
                    {isAnswering ? (
                      <div className="space-y-2.5">
                        <p className="text-[11px] font-semibold text-stone-500">
                          {t('answer.replyingAs', { name: mentorSession?.fullName || '' })}
                        </p>
                        <textarea
                          rows={2}
                          maxLength={4000}
                          value={draftBody}
                          onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={t('answer.bodyPlaceholder')}
                          className="w-full p-2.5 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                        />
                        {answerErrors[q.id] && (
                          <p className="text-[11px] text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {answerErrors[q.id]}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSubmitAnswer(q.id)}
                            className="px-3.5 py-2 rounded-xl bg-amber-900 text-amber-50 text-xs font-bold hover:bg-amber-800 transition-colors cursor-pointer"
                          >
                            {t('answer.submit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnsweringId(null)}
                            className="px-3.5 py-2 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold hover:bg-stone-200 transition-colors cursor-pointer"
                          >
                            {t('answer.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : mentorSession ? (
                      <button
                        type="button"
                        onClick={() => setAnsweringId(q.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        {t('answer.cta')}
                      </button>
                    ) : !checkingMentorSession ? (
                      <Link
                        href="/mentor/dashboard"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        {t('answer.mentorSignInCta')}
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
