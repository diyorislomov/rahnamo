'use client';

import { FormEvent, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, Loader2, Target } from 'lucide-react';
import { CAREER_GOALS, EXPERIENCE_LEVELS, type CareerGoal, type ExperienceLevel } from '@/lib/waitlist';

export default function GoalWaitlist() {
  const t = useTranslations('waitlist');
  const locale = useLocale();
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [goal, setGoal] = useState<CareerGoal>('job');
  const [field, setField] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('student');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, contact, goal, field, experienceLevel, locale }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'submit_failed');
      setSubmitted(true);
    } catch {
      setError(t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="early-access" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 scroll-mt-24">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr] overflow-hidden rounded-[2rem] border border-amber-900/15 bg-white shadow-lg">
        <div className="bg-gradient-to-br from-[#1E1B4B] via-[#2A265F] to-[#3B316B] p-7 sm:p-10 text-amber-50">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">
            <Target className="h-3.5 w-3.5" /> {t('badge')}
          </div>
          <h2 className="mt-4 font-serif text-3xl font-extrabold leading-tight text-amber-100 sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-amber-100/75">{t('subtitle')}</p>
          <div className="mt-7 space-y-3">
            {CAREER_GOALS.map((item, index) => (
              <div key={item} className="flex items-center gap-3 text-sm text-amber-100/90">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-white/10 text-xs font-bold text-amber-300">
                  {index + 1}
                </span>
                <span>{t(`goals.${item}`)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-10">
          {submitted ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-serif text-2xl font-extrabold text-amber-950">{t('successTitle')}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-600">{t('successBody')}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h3 className="font-serif text-2xl font-extrabold text-amber-950">{t('formTitle')}</h3>
                <p className="mt-1 text-xs text-stone-500">{t('formSubtitle')}</p>
              </div>

              <div>
                <label htmlFor="waitlist-name" className="mb-1.5 block text-xs font-bold text-stone-700">{t('nameLabel')}</label>
                <input id="waitlist-name" required minLength={2} maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={t('namePlaceholder')} className="w-full rounded-xl border border-amber-900/15 bg-amber-50/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-700" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="waitlist-goal" className="mb-1.5 block text-xs font-bold text-stone-700">{t('goalLabel')}</label>
                  <select id="waitlist-goal" value={goal} onChange={(event) => setGoal(event.target.value as CareerGoal)} className="w-full rounded-xl border border-amber-900/15 bg-amber-50/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-700">
                    {CAREER_GOALS.map((item) => <option key={item} value={item}>{t(`goals.${item}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="waitlist-level" className="mb-1.5 block text-xs font-bold text-stone-700">{t('levelLabel')}</label>
                  <select id="waitlist-level" value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value as ExperienceLevel)} className="w-full rounded-xl border border-amber-900/15 bg-amber-50/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-700">
                    {EXPERIENCE_LEVELS.map((item) => <option key={item} value={item}>{t(`levels.${item}`)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="waitlist-field" className="mb-1.5 block text-xs font-bold text-stone-700">{t('fieldLabel')}</label>
                <input id="waitlist-field" required minLength={2} maxLength={120} value={field} onChange={(event) => setField(event.target.value)} placeholder={t('fieldPlaceholder')} className="w-full rounded-xl border border-amber-900/15 bg-amber-50/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-700" />
              </div>

              <div>
                <label htmlFor="waitlist-contact" className="mb-1.5 block text-xs font-bold text-stone-700">{t('contactLabel')}</label>
                <input id="waitlist-contact" required maxLength={254} value={contact} onChange={(event) => setContact(event.target.value)} placeholder={t('contactPlaceholder')} className="w-full rounded-xl border border-amber-900/15 bg-amber-50/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-700" />
                <p className="mt-1 text-[10px] text-stone-400">{t('contactHint')}</p>
              </div>

              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

              <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-800 to-amber-900 px-5 py-3.5 text-sm font-bold text-amber-50 shadow-md transition-all hover:from-amber-700 hover:to-amber-800 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {submitting ? t('submitting') : t('submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
