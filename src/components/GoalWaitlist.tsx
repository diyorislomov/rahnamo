'use client';

import { FormEvent, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight, CheckCircle2, Loader2, Target } from 'lucide-react';
import {
  CAREER_GOALS,
  EXPERIENCE_LEVELS,
  type CareerGoal,
  type ExperienceLevel,
} from '@/lib/waitlist';

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
    <section
      id="early-access"
      className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 border-t border-black/[0.05] scroll-mt-24"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-10">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono font-bold text-xs text-[#14171A]">04</span>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#8B9298]">
              {t('badge')}
            </span>
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-[#14171A] tracking-[-0.04em] leading-[1.06]">
            {t('title')}
          </h2>
        </div>
        <div className="lg:col-span-7 lg:pt-8">
          <p className="text-sm sm:text-base text-[#52585C] max-w-2xl leading-relaxed">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Editorial Interactive Waitlist Card */}
      <div className="rounded-3xl bg-white p-6 sm:p-10 shadow-[0_18px_54px_-18px_rgba(20,23,26,0.08)] border border-black/[0.05]">
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: Interactive 01–05 Career Goal Selector Cards */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5">
              {CAREER_GOALS.map((item, index) => {
                const isSelected = goal === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGoal(item)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#FFF5ED] border-[#E06D1A]/45 shadow-2xs'
                        : 'bg-[#FAF7F2] border-black/[0.05] hover:border-black/15 hover:bg-white'
                    }`}
                  >
                    <div className="uzc-dot-corner !w-16 !h-16" aria-hidden="true" />
                    <div className="flex items-center gap-3.5 relative z-10">
                      <span
                        className={`font-display font-black text-2xl tracking-[-0.04em] ${
                          isSelected ? 'text-[#E06D1A]' : 'text-[#8B9298]'
                        }`}
                      >
                        0{index + 1}
                      </span>
                      <span className="font-display font-bold text-sm sm:text-base text-[#14171A]">
                        {t(`goals.${item}`)}
                      </span>
                    </div>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold relative z-10 transition-colors ${
                        isSelected
                          ? 'bg-[#14171A] text-white'
                          : 'bg-white border border-black/10 text-[#787F84]'
                      }`}
                    >
                      →
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Official Waitlist Form */}
            <div className="lg:col-span-7 bg-[#FAF7F2] border border-black/[0.05] rounded-3xl p-6 sm:p-8 relative overflow-hidden">
              <div className="uzc-dot-corner" aria-hidden="true" />

              {submitted ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center text-center relative z-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-bold text-[#252A2D]">
                    {t('successTitle')}
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-[#52585C]">
                    {t('successBody')}
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4 relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#252A2D]/10">
                    <div>
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-[#252A2D]">
                        {t('formTitle')}
                      </h3>
                      <p className="mt-0.5 text-xs text-[#52585C]">{t('formSubtitle')}</p>
                    </div>
                    <span className="eyebrow-pill !text-[10px]">
                      <Target className="w-3 h-3 text-[#D4A84B]" />
                      <span>{t(`goals.${goal}`)}</span>
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="waitlist-name"
                        className="mb-1.5 block text-xs font-bold text-[#252A2D]"
                      >
                        {t('nameLabel')}
                      </label>
                      <input
                        id="waitlist-name"
                        required
                        minLength={2}
                        maxLength={120}
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder={t('namePlaceholder')}
                        className="w-full rounded-xl border border-[#252A2D]/15 bg-white px-4 py-3 text-sm text-[#252A2D] outline-none focus:border-[#0F4C5C] transition-colors"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="waitlist-contact"
                        className="mb-1.5 block text-xs font-bold text-[#252A2D]"
                      >
                        {t('contactLabel')}
                      </label>
                      <input
                        id="waitlist-contact"
                        required
                        maxLength={254}
                        value={contact}
                        onChange={(event) => setContact(event.target.value)}
                        placeholder={t('contactPlaceholder')}
                        className="w-full rounded-xl border border-[#252A2D]/15 bg-white px-4 py-3 text-sm text-[#252A2D] outline-none focus:border-[#0F4C5C] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="waitlist-goal"
                        className="mb-1.5 block text-xs font-bold text-[#252A2D]"
                      >
                        {t('goalLabel')}
                      </label>
                      <select
                        id="waitlist-goal"
                        value={goal}
                        onChange={(event) => setGoal(event.target.value as CareerGoal)}
                        className="w-full rounded-xl border border-[#252A2D]/15 bg-white px-4 py-3 text-sm text-[#252A2D] outline-none focus:border-[#0F4C5C] transition-colors cursor-pointer"
                      >
                        {CAREER_GOALS.map((item) => (
                          <option key={item} value={item}>
                            {t(`goals.${item}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="waitlist-level"
                        className="mb-1.5 block text-xs font-bold text-[#252A2D]"
                      >
                        {t('levelLabel')}
                      </label>
                      <select
                        id="waitlist-level"
                        value={experienceLevel}
                        onChange={(event) =>
                          setExperienceLevel(event.target.value as ExperienceLevel)
                        }
                        className="w-full rounded-xl border border-[#252A2D]/15 bg-white px-4 py-3 text-sm text-[#252A2D] outline-none focus:border-[#0F4C5C] transition-colors cursor-pointer"
                      >
                        {EXPERIENCE_LEVELS.map((item) => (
                          <option key={item} value={item}>
                            {t(`levels.${item}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="waitlist-field"
                      className="mb-1.5 block text-xs font-bold text-[#252A2D]"
                    >
                      {t('fieldLabel')}
                    </label>
                    <input
                      id="waitlist-field"
                      required
                      minLength={2}
                      maxLength={120}
                      value={field}
                      onChange={(event) => setField(event.target.value)}
                      placeholder={t('fieldPlaceholder')}
                      className="w-full rounded-xl border border-[#252A2D]/15 bg-white px-4 py-3 text-sm text-[#252A2D] outline-none focus:border-[#0F4C5C] transition-colors"
                    />
                    <p className="mt-1.5 text-[11px] text-[#787F84]">{t('contactHint')}</p>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-yv-primary w-full justify-between cursor-pointer disabled:opacity-60"
                  >
                    <span>{submitting ? t('submitting') : t('submit')}</span>
                    <span className="badge" aria-hidden="true">
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
