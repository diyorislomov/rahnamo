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
    <div className="min-h-screen bg-[#FFF8E7] text-[#18181B] font-sans antialiased">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-900/10 text-[#0F4C5C] text-[11px] font-mono uppercase tracking-[0.14em] font-semibold mb-3 shadow-2xs">
            <MessageCircleQuestion className="w-3.5 h-3.5 text-[#D4A84B]" />
            <span>{t('badge')}</span>
          </div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#18181B] tracking-tight">
            {t('heading')}
          </h1>
          <p className="text-sm text-zinc-600 mt-2 max-w-xl mx-auto leading-relaxed">
            {t('subheading')}
          </p>
        </div>

        {/* Ask a question */}
        <form
          onSubmit={handleSubmitQuestion}
          className="surface-card rounded-2xl p-6 sm:p-8 space-y-4 mb-10"
        >
          <h2 className="font-serif text-lg font-bold text-[#18181B]">{t('askForm.heading')}</h2>

          <div>
            <label htmlFor="forum-title" className="text-xs font-medium text-zinc-700 block mb-1.5">
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
              className={`w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border rounded-xl outline-none transition-colors ${
                errors.title ? 'border-red-500 bg-red-50/20' : 'border-zinc-900/12 focus:bg-white focus:border-[#0F4C5C] text-[#18181B]'
              }`}
            />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="forum-category" className="text-xs font-medium text-zinc-700 block mb-1.5">
              {t('askForm.categoryLabel')}
            </label>
            <select
              id="forum-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C] text-[#18181B] cursor-pointer"
            >
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SPECIALTY_CONFIG[key].icon} {tSpecialties(key)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="forum-body" className="text-xs font-medium text-zinc-700 block mb-1.5">
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
              className={`w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border rounded-xl outline-none transition-colors ${
                errors.body ? 'border-red-500 bg-red-50/20' : 'border-zinc-900/12 focus:bg-white focus:border-[#0F4C5C] text-[#18181B]'
              }`}
            />
            {errors.body && <p className="text-xs text-red-600 mt-1">{errors.body}</p>}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="forum-anonymous"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="accent-[#0F4C5C] cursor-pointer w-4 h-4"
            />
            <label htmlFor="forum-anonymous" className="text-xs font-medium text-zinc-700 cursor-pointer">
              {t('askForm.anonymousLabel')}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isAnonymous && (
              <div>
                <label htmlFor="forum-name" className="text-xs font-medium text-zinc-700 block mb-1.5">
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
                  className={`w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border rounded-xl outline-none transition-colors ${
                    errors.name ? 'border-red-500 bg-red-50/20' : 'border-zinc-900/12 focus:bg-white focus:border-[#0F4C5C] text-[#18181B]'
                  }`}
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>
            )}

            <div className={isAnonymous ? 'sm:col-span-2' : ''}>
              <label htmlFor="forum-email" className="text-xs font-medium text-zinc-700 block mb-1.5">
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
                className={`w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border rounded-xl outline-none transition-colors ${
                  errors.email ? 'border-red-500 bg-red-50/20' : 'border-zinc-900/12 focus:bg-white focus:border-[#0F4C5C] text-[#18181B]'
                }`}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              <p className="text-[11px] text-zinc-500 mt-1">
                {t('askForm.emailPrivacyNote')}
              </p>
            </div>
          </div>

          {submitError && (
            <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#0F4C5C] hover:bg-[#09323D] text-white font-semibold text-sm rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4 text-[#D4A84B]" />
            <span>{submitting ? t('askForm.submitting') : t('askForm.submit')}</span>
          </button>

          {justSubmitted && (
            <p className="text-xs text-emerald-700 font-semibold text-center">
              {t('askForm.successNote')}
            </p>
          )}
        </form>

        {/* Question list */}
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-bold text-[#18181B] flex items-center gap-2">
            <span>{t('recentQuestionsHeading')}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#0F4C5C]/10 text-[#0F4C5C] font-mono">
              {sortedQuestions.length}
            </span>
          </h2>

          {loading ? (
            <div className="surface-card rounded-2xl p-12 text-center">
              <p className="text-xs text-zinc-500">{t('loadingQuestions')}</p>
            </div>
          ) : loadError ? (
            <div className="bg-red-50 rounded-2xl p-8 text-center border border-red-200">
              <p className="text-xs font-medium text-red-700">{loadError}</p>
            </div>
          ) : sortedQuestions.length === 0 ? (
            <div className="surface-card rounded-2xl p-12 text-center">
              <MessageCircleQuestion className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
              <h4 className="font-serif font-bold text-base text-[#18181B]">{t('emptyTitle')}</h4>
              <p className="text-xs text-zinc-500 mt-1">{t('emptyBody')}</p>
            </div>
          ) : (
            sortedQuestions.map((q) => {
              const questionAnswers = answers.filter((a) => a.questionId === q.id);
              const cfg = SPECIALTY_CONFIG[q.category];
              const isAnswering = answeringId === q.id;
              const draftBody = answerDrafts[q.id] || '';

              return (
                <div key={q.id} className="surface-card rounded-2xl p-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    {cfg && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F5EFE0] text-zinc-700 border border-zinc-900/8">
                        {cfg.icon} {tSpecialties(q.category)}
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <UserRound className="w-3 h-3" />
                      {q.studentNameOrAnonymous}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-[#18181B] mt-2.5">{q.title}</h3>
                  <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">{q.body}</p>

                  {/* Answers */}
                  {questionAnswers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-900/8 space-y-3">
                      {questionAnswers.map((a) => {
                        return (
                          <div key={a.id} className="bg-[#FFF8E7] border border-zinc-900/10 rounded-xl p-3.5">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F4C5C]">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#0F4C5C]" />
                              <span>{a.counselorName || t('defaultResponderName')}</span>
                            </div>
                            <p className="text-xs text-zinc-700 mt-1.5 leading-relaxed">{a.body}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Answer this */}
                  <div className="mt-4 pt-3 border-t border-zinc-900/8">
                    {isAnswering ? (
                      <div className="space-y-2.5">
                        <p className="text-[11px] font-medium text-zinc-500">
                          {t('answer.replyingAs', { name: mentorSession?.fullName || '' })}
                        </p>
                        <textarea
                          rows={2}
                          maxLength={4000}
                          value={draftBody}
                          onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={t('answer.bodyPlaceholder')}
                          className="w-full px-3 py-2 text-xs bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                        />
                        {answerErrors[q.id] && (
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {answerErrors[q.id]}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSubmitAnswer(q.id)}
                            className="px-3.5 py-2 rounded-xl bg-[#0F4C5C] text-white text-xs font-semibold hover:bg-[#09323D] transition-colors cursor-pointer"
                          >
                            {t('answer.submit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnsweringId(null)}
                            className="px-3.5 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
                          >
                            {t('answer.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : mentorSession ? (
                      <button
                        type="button"
                        onClick={() => setAnsweringId(q.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F4C5C] hover:text-[#09323D] cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        {t('answer.cta')}
                      </button>
                    ) : !checkingMentorSession ? (
                      <Link
                        href="/mentor/dashboard"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F4C5C] hover:text-[#09323D]"
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
