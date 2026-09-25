'use client';

import { Suspense, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, RefreshCw, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CleanHero from '@/components/CleanHero';
import CatalogIntro from '@/components/CatalogIntro';
import CounselorCard from '@/components/CounselorCard';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import { isSupabaseConfigured, mapCounselorRow } from '@/lib/counselors';
import { supabase } from '@/lib/supabase';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import { Counselor } from '@/types';
import { getCounselorContent } from '@/lib/counselor-content';

function Discovery() {
  const t = useTranslations('discovery');
  const tSpecialties = useTranslations('specialties');
  const locale = useLocale();
  const params = useSearchParams();
  const configured = isSupabaseConfigured();
  const [counselors, setCounselors] = useState<Counselor[]>(() => configured ? [] : INITIAL_COUNSELORS);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() => configured ? 'loading' : 'ready');
  const [attempt, setAttempt] = useState(0);
  const query = params.get('q') || '';
  const requestedCategory = params.get('category') || 'All';
  const category = Object.hasOwn(SPECIALTY_CONFIG, requestedCategory) ? requestedCategory : 'All';
  const company = params.get('company') || '';
  const requestedSort = params.get('sort');
  const sort = requestedSort === 'price-low' || requestedSort === 'price-high' ? requestedSort : 'name';

  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    // Timeout makes a broken connection recoverable; successful responses are never replaced by sample data.
    const timeout = setTimeout(() => controller.abort(), 15000);
    let cancelled = false;
    Promise.resolve(supabase.from('counselors').select('*').abortSignal(controller.signal))
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setStatus('error'); return; }
        setCounselors((data || []).map(mapCounselorRow));
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); })
      .finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [configured, attempt]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || (key === 'category' && value === 'All') || (key === 'sort' && value === 'name')) next.delete(key);
    else next.set(key, value);
    const search = next.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`);
  }

  function resetFilters() {
    const next = new URLSearchParams(params.toString());
    ['q', 'category', 'company', 'sort'].forEach((key) => next.delete(key));
    window.history.replaceState(null, '', `${window.location.pathname}${next.size ? `?${next}` : ''}${window.location.hash}`);
  }

  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const filtered = counselors.filter((c) => {
    const content = getCounselorContent(c, locale, !configured);
    const labels = c.specialties.map((s) => Object.hasOwn(SPECIALTY_CONFIG, s) ? tSpecialties(s) : s);
    const searchable = [c.fullName, c.headline, c.bio, content.headline, content.bio, content.help, content.company, ...c.specialties, ...labels].join(' ').toLocaleLowerCase(locale);
    return (category === 'All' || c.specialties.includes(category)) && (!company || c.company === company) && searchable.includes(normalizedQuery);
  }).sort((a, b) => sort === 'price-low' ? a.standardPrice - b.standardPrice : sort === 'price-high' ? b.standardPrice - a.standardPrice : a.fullName.localeCompare(b.fullName, locale));
  // Keep the original stable company-value order: ICU versions disagree on
  // Uzbek digraphs in translated labels, which would change hydration order.
  const companies = Array.from(new Map(counselors.filter((c) => !!c.company).map((c) => [c.company!, {
    value: c.company!, label: getCounselorContent(c, locale, !configured).company || c.company!,
  }])).values()).sort((a, b) => a.value < b.value ? -1 : a.value > b.value ? 1 : 0);
  const hasFilters = !!query || category !== 'All' || !!company || sort !== 'name';

  return (
    <>
      <CleanHero />
      <CatalogIntro searchQuery={query} setSearchQuery={(value) => updateFilter('q', value)} selectedTag={category} setSelectedTag={(value) => updateFilter('category', value)}
        companies={companies} selectedCompany={company} setSelectedCompany={(value) => updateFilter('company', value)} selectedSort={sort} setSelectedSort={(value) => updateFilter('sort', value)} />
      <section id="rahnamolar" className="ui-container pb-10 pt-3 sm:pb-16 sm:pt-6" aria-labelledby="results-title">
        {!configured && <div className="mb-3 rounded-lg bg-[#f4eee5] px-3 py-2 text-xs leading-relaxed text-[#65533f]" role="note"><span className="font-semibold">{t('results.demoTitle')}</span>{' '}{t('results.demoBody')}</div>}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 sm:mb-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="results-title" className="text-xl font-semibold tracking-tight">{t('results.title')}</h2>
            <p className="ui-muted text-sm" role="status" aria-live="polite">{status === 'loading' ? t('results.loading') : status === 'ready' ? t('results.count', { count: filtered.length }) : t('results.errorTitle')}</p>
          </div>
          {hasFilters && <button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#8b431b] underline underline-offset-4" onClick={resetFilters}>{t('search.reset')}<RefreshCw size={14} aria-hidden="true" /></button>}
        </div>
        {status === 'loading' ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">{[1, 2, 3].map((id) => <div key={id} className="ui-panel min-h-72 p-6"><div className="h-16 w-16 rounded-xl bg-[#f0e8dc]" /><div className="mt-5 h-4 w-3/4 rounded bg-[#f0e8dc]" /><div className="mt-3 h-4 w-full rounded bg-[#f0e8dc]" /><div className="mt-3 h-4 w-2/3 rounded bg-[#f0e8dc]" /></div>)}</div> : status === 'error' ? (
          <div className="ui-panel px-6 py-10 text-center" role="alert">
            <h3 className="text-lg font-semibold">{t('results.errorTitle')}</h3><p className="ui-muted mx-auto mt-2 max-w-md">{t('results.errorBody')}</p>
            <button type="button" className="ui-button mt-5" onClick={() => { setStatus('loading'); setAttempt((value) => value + 1); }}><RefreshCw size={17} aria-hidden="true" />{t('results.retry')}</button>
          </div>
        ) : filtered.length ? <div className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map((c) => <CounselorCard key={c.id} counselor={c} demo={!configured} />)}</div> : (
          <div className="ui-panel px-6 py-12 text-center">
            <Search className="mx-auto mb-4 text-[#8b6d49]" size={26} aria-hidden="true" />
            <h3 className="text-lg font-semibold">{t(counselors.length ? 'results.emptyTitle' : 'results.noneTitle')}</h3>
            <p className="ui-muted mx-auto mt-2 max-w-md">{t(counselors.length ? 'results.emptyBody' : 'results.noneBody')}</p>
            {hasFilters && <button type="button" onClick={resetFilters} className="ui-button-secondary mt-5">{t('search.reset')}</button>}
          </div>
        )}
      </section>
      <section id="how-it-works" className="border-y border-[#e7ddd0] bg-[#f1e8d9] py-12 sm:py-16" aria-labelledby="how-title">
        <div className="ui-container">
          <p className="ui-eyebrow">{t('how.eyebrow')}</p><h2 id="how-title" className="mt-2 max-w-lg font-serif text-3xl leading-tight sm:text-4xl">{t('how.title')}</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {(['one', 'two', 'three'] as const).map((step, index) => <li key={step}>
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#bba182] text-sm font-semibold text-[#8b431b]">0{index + 1}</span>
              <h3 className="text-base font-semibold">{t(`how.${step}Title`)}</h3><p className="ui-muted mt-2 text-sm leading-relaxed">{t(`how.${step}Body`)}</p>
            </li>)}
          </ol>
        </div>
      </section>
      <section className="ui-container grid gap-8 py-12 sm:py-16 md:grid-cols-[.8fr_1.2fr]" aria-labelledby="faq-title">
        <div><p className="ui-eyebrow">{t('faq.eyebrow')}</p><h2 id="faq-title" className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">{t('faq.title')}</h2><a href="https://t.me/rahnamo_admin" target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#8b431b]">{t('footer.support')}<ArrowRight size={16} aria-hidden="true" /></a></div>
        <div>{[1, 2, 3].map((id) => <details className="ui-faq" key={id}><summary>{t(`faq.q${id}`)}</summary><p className="ui-muted pb-5 text-sm leading-relaxed">{t(`faq.a${id}`)}</p></details>)}</div>
      </section>
    </>
  );
}

export default function Home() {
  const t = useTranslations('discovery.results');
  return <div className="ui-page"><Navbar /><main><Suspense fallback={<div className="ui-container py-16" role="status">{t('loading')}</div>}><Discovery /></Suspense></main><Footer /></div>;
}
