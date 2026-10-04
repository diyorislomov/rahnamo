'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CounselorCard from '@/components/CounselorCard';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import { isSupabaseConfigured, mapCounselorRow, PUBLIC_COUNSELOR_COLUMNS } from '@/lib/counselors';
import { supabase } from '@/lib/supabase';
import type { Counselor } from '@/types';

const CATEGORIES = Object.keys(SPECIALTY_CONFIG).filter((key) => key !== 'All');
const GOALS = ['explore', 'education', 'job', 'interview', 'business'] as const;
const FORMATS = ['quick', 'deep', 'ongoing', 'text'] as const;
const BUDGETS = ['100000', '250000', '500000', 'unlimited'] as const;

const GOAL_KEYWORDS: Record<(typeof GOALS)[number], string[]> = {
  explore: [],
  education: ['study', 'university', 'scholarship', 'grant', 'education', 'residency', 'll.m'],
  job: ['career', 'engineering', 'tech', 'practice', 'freelance', 'company'],
  interview: ['interview', 'portfolio', 'cv', 'resume', 'system design'],
  business: ['business', 'trade', 'export', 'freelance', 'studio', 'startup'],
};

export default function MatchPage() {
  const t = useTranslations('matching');
  const tSpecialties = useTranslations('specialties');
  const [counselors, setCounselors] = useState<Counselor[]>(() => isSupabaseConfigured() ? [] : INITIAL_COUNSELORS);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [goal, setGoal] = useState<(typeof GOALS)[number]>('explore');
  const [format, setFormat] = useState<(typeof FORMATS)[number]>('quick');
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]>('250000');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    Promise.resolve(supabase.from('counselors').select(PUBLIC_COUNSELOR_COLUMNS))
      .then(({ data, error }) => {
        if (error) throw error;
        setCounselors((data || []).map(mapCounselorRow));
      })
      .catch(() => setCounselors([]));
  }, []);

  const matches = useMemo(() => {
    const maxBudget = budget === 'unlimited' ? Number.MAX_SAFE_INTEGER : Number(budget);
    return counselors
      .map((counselor) => {
        const searchable = `${counselor.headline} ${counselor.bio} ${counselor.specialties.join(' ')}`.toLowerCase();
        let score = counselor.specialties.includes(category) ? 12 : category === 'Other' ? 1 : 0;
        score += GOAL_KEYWORDS[goal].filter((keyword) => searchable.includes(keyword)).length * 2;
        if (format === 'text' && counselor.pricePerQuestion) score += 5;
        if (format === 'quick' && counselor.standardPrice <= maxBudget) score += 4;
        if ((format === 'deep' || format === 'ongoing') && counselor.premiumPrice <= maxBudget) score += 4;
        const relevantPrice = format === 'text'
          ? counselor.pricePerQuestion || counselor.standardPrice
          : format === 'quick'
            ? counselor.standardPrice
            : counselor.premiumPrice;
        if (relevantPrice <= maxBudget) score += 3;
        score += Math.min(counselor.rating, 5);
        return { counselor, score };
      })
      .sort((left, right) => right.score - left.score || right.counselor.rating - left.counselor.rating)
      .slice(0, 3)
      .map((result) => result.counselor);
  }, [budget, category, counselors, format, goal]);

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> {t('badge')}
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-amber-950 mt-4">{t('title')}</h1>
          <p className="text-sm text-stone-600 mt-3">{t('subtitle')}</p>
        </div>

        <div className="max-w-3xl mx-auto bg-white/95 rounded-3xl border border-amber-900/15 shadow-sm p-6 sm:p-8 mt-8 space-y-6">
          <Question title={t('categoryLabel')}>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((key) => (
                <button key={key} type="button" onClick={() => { setCategory(key); setShowResults(false); }} className={`px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${category === key ? 'bg-amber-900 border-amber-900 text-amber-50' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
                  {SPECIALTY_CONFIG[key].icon} {tSpecialties(key)}
                </button>
              ))}
            </div>
          </Question>

          <Question title={t('goalLabel')}>
            <OptionGrid values={GOALS} selected={goal} onSelect={(value) => { setGoal(value); setShowResults(false); }} label={(value) => t(`goals.${value}`)} />
          </Question>
          <Question title={t('formatLabel')}>
            <OptionGrid values={FORMATS} selected={format} onSelect={(value) => { setFormat(value); setShowResults(false); }} label={(value) => t(`formats.${value}`)} />
          </Question>
          <Question title={t('budgetLabel')}>
            <OptionGrid values={BUDGETS} selected={budget} onSelect={(value) => { setBudget(value); setShowResults(false); }} label={(value) => t(`budgets.${value}`)} />
          </Question>

          <button type="button" onClick={() => setShowResults(true)} className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-amber-800 to-amber-900 text-amber-50 font-serif font-bold cursor-pointer shadow-md">
            <Compass className="w-5 h-5" /> {t('find')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {showResults && (
          <section className="mt-12">
            <div className="text-center mb-6">
              <h2 className="font-serif text-2xl font-extrabold text-amber-950">{t('resultsTitle')}</h2>
              <p className="text-xs text-stone-500 mt-1">{t('resultsSubtitle')}</p>
            </div>
            {matches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {matches.map((counselor) => <CounselorCard key={counselor.id} counselor={counselor} />)}
              </div>
            ) : (
              <p className="text-center text-sm text-stone-500 bg-white border border-stone-200 rounded-2xl p-8">{t('empty')}</p>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="text-sm font-bold text-amber-950 mb-3">{title}</h2>{children}</div>;
}

function OptionGrid<T extends string>({ values, selected, onSelect, label }: { values: readonly T[]; selected: T; onSelect: (value: T) => void; label: (value: T) => string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {values.map((value) => (
        <button key={value} type="button" onClick={() => onSelect(value)} className={`text-left px-4 py-3 rounded-xl border text-xs font-semibold cursor-pointer ${selected === value ? 'bg-amber-100 border-amber-700 text-amber-950 ring-1 ring-amber-700/20' : 'bg-white border-amber-900/15 text-stone-700 hover:bg-amber-50'}`}>
          {label(value)}
        </button>
      ))}
    </div>
  );
}
