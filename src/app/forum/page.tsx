'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { MessageCircle, Search, Send } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import { createRequestId } from '@/lib/uuid';
import { SupportShell, SupportHeader, Field, Notice, Busy, SupportApiError, supportRequest } from '@/components/SupportUI';

interface Question { id: string; student_name_or_anonymous: string; category: string; title: string; body: string; created_at: string }
interface Answer { id: string; question_id: string; counselor_id: string; body: string; created_at: string }
interface Mentor { id: string; full_name: string; headline: string }
const CATEGORIES = Object.keys(SPECIALTY_CONFIG).filter(key => key !== 'All');

export default function ForumPage() {
  const t = useTranslations('forum');
  const s = useTranslations('support.forum');
  const c = useTranslations('support.common');
  const specialties = useTranslations('specialties');
  const locale = useLocale();
  const configured = isSupabaseConfigured();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [questionError, setQuestionError] = useState('');
  const [posted, setPosted] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [answering, setAnswering] = useState<string | null>(null);
  const [answerBusy, setAnswerBusy] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [answerSaved, setAnswerSaved] = useState(false);

  useEffect(() => {
    let active = true;
    if (!configured) { Promise.resolve().then(() => { if (active) setLoading(false); }); return () => { active = false; }; }
    Promise.all([
      supabase.from('public_forum_questions').select('id,student_name_or_anonymous,category,title,body,created_at').order('created_at', { ascending: false }),
      supabase.from('forum_answers').select('id,question_id,counselor_id,body,created_at').order('created_at', { ascending: true }),
      supabase.from('counselors').select('id,full_name,headline').order('full_name'),
    ]).then(([q,a,m]) => {
      if (q.error || a.error || m.error) throw new Error('load_failed');
      if (!active) return;
      setQuestions(q.data || []); setAnswers(a.data || []); setMentors(m.data || []); setLoadError(false);
    }).catch(() => { if (active) setLoadError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [configured, revision]);

  async function submitQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting || !configured) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) || '').trim();
    setSubmitting(true); setQuestionError(''); setPosted(false);
    try {
      const result = await supportRequest<{ success: boolean; question: Question }>('/api/forum/question', {
        id: createRequestId(), student_name_or_anonymous: anonymous ? t('anonymousName') : value('name'),
        email: value('email'), category: value('category'), title: value('title'), body: value('body'),
      });
      if (!result.question?.id) throw new Error('missing_question');
      setQuestions(prev => [result.question, ...prev.filter(q => q.id !== result.question.id)]);
      setPosted(true); form.reset(); setAnonymous(false);
    } catch (err) { setQuestionError(err instanceof SupportApiError && err.status === 429 ? c('rateLimit') : c('error')); }
    finally { setSubmitting(false); }
  }

  async function submitAnswer(event: React.FormEvent<HTMLFormElement>, questionId: string) {
    event.preventDefault(); if (answerBusy) return;
    const form = new FormData(event.currentTarget);
    setAnswerBusy(true); setAnswerError(''); setAnswerSaved(false);
    try {
      const result = await supportRequest<{ success: boolean; persisted?: boolean; answer: Answer & {questionId?: string; counselorId?: string; createdAt?: string} }>('/api/forum/answer', {
        questionId, counselorId: String(form.get('counselorId')), body: String(form.get('body')).trim(), passcode: String(form.get('passcode')),
      });
      if (!result.answer?.id || result.persisted === false) throw new Error('not_persisted');
      const a = result.answer;
      setAnswers(prev => [...prev.filter(row => row.id !== a.id), {id: a.id, body: a.body, question_id: a.question_id || a.questionId || questionId, counselor_id: a.counselor_id || a.counselorId || '', created_at: a.created_at || a.createdAt || new Date().toISOString()}]);
      setAnswering(null); setAnswerSaved(true);
    } catch (err) { setAnswerError(err instanceof SupportApiError && err.status === 429 ? c('rateLimit') : err instanceof SupportApiError && err.status === 401 ? t('answer.invalidPasscode') : t('answer.saveError')); }
    finally { setAnswerBusy(false); }
  }

  const filtered = useMemo(() => questions.filter(q => (!filter || q.category === filter) && `${q.title} ${q.body}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [questions, filter, query]);
  const date = (value: string) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(locale, {day:'numeric',month:'short',year:'numeric'}); };

  return <SupportShell>
    <SupportHeader eyebrow={t('badge')} title={t('heading')} description={t('subheading')} />
    {!configured && <div className="mb-6"><Notice>{c('demo')}</Notice></div>}
    <div className="grid items-start gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="ui-panel p-5 sm:p-6"><h2 className="font-serif text-2xl font-semibold">{t('askForm.heading')}</h2><p className="ui-muted mt-3 text-sm leading-relaxed">{s('privacy')}</p><form onSubmit={submitQuestion} className="mt-6 space-y-5" aria-busy={submitting}>
        <fieldset disabled={submitting || !configured} className="space-y-5 disabled:opacity-70">
          <Field id="forum-title" label={t('askForm.titleLabel')}><input id="forum-title" name="title" className="ui-input" required minLength={5} maxLength={180} /></Field>
          <Field id="forum-category" label={t('askForm.categoryLabel')}><select id="forum-category" name="category" className="ui-input" required>{CATEGORIES.map(key => <option key={key} value={key}>{specialties(key)}</option>)}</select></Field>
          <Field id="forum-body" label={t('askForm.bodyLabel')}><textarea id="forum-body" name="body" className="ui-input" required minLength={10} maxLength={4000} rows={5} /></Field>
          <label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} className="h-5 w-5 accent-amber-900" />{t('askForm.anonymousLabel')}</label>
          {!anonymous && <Field id="forum-name" label={t('askForm.nameLabel')}><input id="forum-name" name="name" autoComplete="name" className="ui-input" required minLength={2} maxLength={100} /></Field>}
          <Field id="forum-email" label={t('askForm.emailLabel')} hint={t('askForm.emailPrivacyNote')}><input id="forum-email" name="email" autoComplete="email" type="email" className="ui-input" required maxLength={254} aria-describedby="forum-email-hint" /></Field>
          <button type="submit" className="ui-button w-full"><Send className="h-4 w-4" aria-hidden="true" />{submitting ? t('askForm.submitting') : t('askForm.submit')}</button>
        </fieldset>
        {questionError && <Notice>{questionError}</Notice>}{posted && <Notice success>{t('askForm.successNote')}</Notice>}
      </form></section>
      <section className="min-w-0 space-y-5" aria-labelledby="recent-questions">
        <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="recent-questions" className="font-serif text-2xl font-semibold">{t('recentQuestionsHeading')}</h2><span className="ui-muted text-sm">{s('results', {count: filtered.length})}</span></div>
        <div className="grid gap-3 sm:grid-cols-2"><Field id="question-search" label={s('search')}><div className="relative"><Search className="pointer-events-none absolute top-3.5 left-3 h-5 w-5 text-stone-500" aria-hidden="true" /><input id="question-search" type="search" value={query} onChange={e => setQuery(e.target.value)} className="ui-input" style={{paddingLeft:40}} /></div></Field><Field id="question-filter" label={s('filter')}><select id="question-filter" value={filter} onChange={e => setFilter(e.target.value)} className="ui-input"><option value="">{s('all')}</option>{CATEGORIES.map(key => <option key={key} value={key}>{specialties(key)}</option>)}</select></Field></div>
        {loadError && <Notice><p>{c('loadError')}</p><button className="mt-2 font-semibold underline" type="button" onClick={() => { setLoading(true); setRevision(v => v + 1); }}>{c('retry')}</button></Notice>}
        {answerSaved && <Notice success>{s('answerSaved')}</Notice>}
        {loading ? <Busy label={c('loading')} /> : filtered.length === 0 && !loadError ? <div className="ui-panel p-8 text-center"><MessageCircle className="mx-auto mb-3 h-8 w-8 text-amber-800" aria-hidden="true" /><h3 className="font-serif text-xl font-semibold">{questions.length ? c('noResults') : t('emptyTitle')}</h3><p className="ui-muted mt-2 text-sm">{questions.length ? '' : t('emptyBody')}</p></div> : null}
        {filtered.map(q => <article key={q.id} className="ui-panel overflow-hidden p-5 sm:p-7">
          <div className="ui-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span className="ui-status">{specialties.has(q.category) ? specialties(q.category) : q.category}</span><span>{q.student_name_or_anonymous}</span><time dateTime={q.created_at}>{date(q.created_at)}</time></div>
          <h3 className="mt-4 break-words font-serif text-xl font-semibold leading-snug sm:text-2xl">{q.title}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700 sm:text-base">{q.body}</p>
          <div className="mt-6 space-y-4 border-t border-amber-950/10 pt-5">{answers.filter(a => a.question_id === q.id).map(a => {
            const mentor = mentors.find(m => m.id === a.counselor_id);
            return <div key={a.id} className="rounded-2xl bg-amber-50/80 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/counselors/${encodeURIComponent(a.counselor_id)}`} className="text-sm font-semibold text-amber-950 underline-offset-4 hover:underline">{mentor?.full_name || t('defaultResponderName')}</Link><span className="text-xs text-stone-500">{date(a.created_at)}</span></div>{mentor?.headline && <p className="mt-1 text-xs text-stone-600">{mentor.headline}</p>}<p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{a.body}</p></div>;
          })}{!answers.some(a => a.question_id === q.id) && <p className="ui-muted text-sm">{s('noAnswers')}</p>}</div>
          {answering === q.id ? <form onSubmit={event => submitAnswer(event, q.id)} className="mt-5 space-y-4" aria-busy={answerBusy}><fieldset disabled={answerBusy} className="space-y-4 disabled:opacity-70">
            <Field id={`mentor-${q.id}`} label={s('mentor')}><select id={`mentor-${q.id}`} name="counselorId" className="ui-input" required defaultValue=""><option value="">{t('answer.selectCounselorPlaceholder')}</option>{mentors.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></Field>
            <Field id={`answer-${q.id}`} label={s('answerLabel')}><textarea id={`answer-${q.id}`} name="body" className="ui-input" required minLength={5} maxLength={4000} rows={4} /></Field>
            <Field id={`code-${q.id}`} label={s('codeLabel')} hint={s('codeHint')}><input id={`code-${q.id}`} name="passcode" type="password" autoComplete="off" maxLength={200} required className="ui-input" aria-describedby={`code-${q.id}-hint`} /></Field>
            <div className="flex flex-wrap gap-3"><button className="ui-button" type="submit">{answerBusy ? c('saving') : t('answer.submit')}</button><button className="ui-button-secondary" type="button" onClick={() => setAnswering(null)}>{c('cancel')}</button></div>
          </fieldset>{answerError && <Notice>{answerError}</Notice>}</form> : <button className="ui-button-secondary mt-5" type="button" disabled={!configured || !mentors.length || answerBusy} onClick={() => {setAnswering(q.id); setAnswerError('');}}>{t('answer.cta')}</button>}
        </article>)}
      </section>
    </div>
  </SupportShell>;
}
