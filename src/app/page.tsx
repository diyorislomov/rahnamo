'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SmoothScroll from '@/components/SmoothScroll';
import CleanHero from '@/components/CleanHero';
import CatalogIntro from '@/components/CatalogIntro';
import CounselorCard from '@/components/CounselorCard';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import { isSupabaseConfigured, mapCounselorRow } from '@/lib/counselors';
import { supabase } from '@/lib/supabase';
import { Counselor } from '@/types';
import { Search, ChevronDown, Sparkles } from 'lucide-react';

type SortOption = 'rating' | 'popular' | 'price-low' | 'price-high';

const ALL_COMPANIES = 'All';

// Merge live Supabase rows onto the mock list by id: a matching id keeps the
// mock's decorative-only fields (responseTime/totalSessions/outcomes -- not
// real DB columns) while taking everything else from the live row; an id
// that only exists in Supabase (a newly approved counselor) is appended.
function mergeCounselors(mock: Counselor[], live: Counselor[]): Counselor[] {
  const byId = new Map(mock.map((c) => [c.id, c]));
  for (const liveC of live) {
    const existing = byId.get(liveC.id);
    byId.set(liveC.id, existing ? { ...existing, ...liveC } : liveC);
  }
  return Array.from(byId.values());
}

export default function Home() {
  const t = useTranslations('home');
  const [counselors, setCounselors] = useState<Counselor[]>(INITIAL_COUNSELORS);
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [selectedCompany, setSelectedCompany] = useState<string>(ALL_COMPANIES);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    Promise.resolve(supabase.from('counselors').select('*'))
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setCounselors(mergeCounselors(INITIAL_COUNSELORS, data.map(mapCounselorRow)));
        }
      })
      .catch((err: unknown) => console.warn('Counselors fetch error, using mock catalog:', err));
  }, []);

  const COMPANIES = useMemo(
    () => [
      ALL_COMPANIES,
      ...Array.from(new Set(counselors.map((c) => c.company).filter((c): c is string => Boolean(c)))),
    ],
    [counselors]
  );

  // Filter & Search logic — category and company combine (AND), not replace
  const filteredCounselors = counselors.filter((counselor) => {
    const matchesTag =
      selectedTag === 'All' || counselor.specialties.includes(selectedTag);

    const matchesCompany =
      selectedCompany === ALL_COMPANIES || counselor.company === selectedCompany;

    const matchesSearch =
      searchQuery.trim() === '' ||
      counselor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      counselor.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      counselor.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      counselor.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTag && matchesCompany && matchesSearch;
  });

  // Sort logic
  const sortedCounselors = [...filteredCounselors].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'popular') return b.reviewsCount - a.reviewsCount;
    if (sortBy === 'price-low') return a.standardPrice - b.standardPrice;
    if (sortBy === 'price-high') return b.standardPrice - a.standardPrice;
    return 0;
  });

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200">
      <SmoothScroll>
        <Navbar />

        <CleanHero counselors={counselors} />

        <CatalogIntro
          counselors={counselors}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Sort + company refinement for the results below — search and the
              primary category picker now live upstream in CatalogIntro, so
              this card only holds what actually refines what you're already
              looking at. */}
          <section id="rahnamolar" className="bg-white/95 p-6 sm:p-8 rounded-3xl border border-amber-900/15 shadow-sm my-8 space-y-5 scroll-mt-24">
            <div className="flex items-center justify-end gap-2 text-xs font-semibold">
              <span className="text-stone-500 whitespace-nowrap">{t('sortLabel')}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-amber-50/80 border border-amber-900/15 text-amber-950 font-bold py-3 px-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-amber-700 cursor-pointer"
              >
                <option value="rating">{t('sortOptions.rating')}</option>
                <option value="popular">{t('sortOptions.popular')}</option>
                <option value="price-low">{t('sortOptions.priceLow')}</option>
                <option value="price-high">{t('sortOptions.priceHigh')}</option>
              </select>
            </div>

            {/* Company / Institution Filter Pills — combines with category above (AND) */}
            {COMPANIES.length > 1 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-amber-900/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 self-center pr-1">
                  {t('companyLabel')}
                </span>
                {COMPANIES.map((name) => {
                  const isSelected = selectedCompany === name;
                  return (
                    <button
                      key={name}
                      onClick={() => setSelectedCompany(name)}
                      className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 border cursor-pointer ${
                        isSelected
                          ? 'bg-amber-900 text-amber-50 border-amber-950 shadow-xs'
                          : 'bg-white text-stone-600 border-amber-900/15 hover:bg-amber-50/60'
                      }`}
                    >
                      {name === ALL_COMPANIES ? t('allCompanies') : name}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Mentor Cards Grid (Lively Micro-Interactions & Hover Glow) */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-serif font-bold text-xl sm:text-2xl text-amber-950 flex items-center gap-2">
                  <span>{t('selectedHeading')}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-mono">
                    {sortedCounselors.length}
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  {t('selectedSubheading')}
                </p>
              </div>
            </div>

            {sortedCounselors.length === 0 ? (
              <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 my-6 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-8 h-8 text-amber-800" />
                </div>
                <h4 className="font-serif font-bold text-lg text-amber-950">{t('emptyTitle')}</h4>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  {t('emptyBody')}
                </p>
                <button
                  onClick={() => {
                    setSelectedTag('All');
                    setSelectedCompany(ALL_COMPANIES);
                    setSearchQuery('');
                  }}
                  className="mt-4 bg-amber-900 text-amber-50 font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-amber-800 transition-all cursor-pointer"
                >
                  {t('emptyReset')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedCounselors.map((counselor) => (
                  <CounselorCard key={counselor.id} counselor={counselor} />
                ))}
              </div>
            )}
          </section>


          {/* How Rahnamo Works Section (Desert Oasis Theme) */}
          <section id="how-it-works" className="bg-gradient-to-b from-[#1E1B4B] via-[#2A265F] to-[#1E1B4B] text-amber-50 rounded-3xl p-8 sm:p-12 my-16 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />

            <div className="text-center max-w-2xl mx-auto mb-12 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('howItWorks.badge')}</span>
              </div>
              <h2 className="font-serif font-bold text-2xl sm:text-4xl text-amber-100">
                {t('howItWorks.heading')}
              </h2>
              <p className="text-xs sm:text-sm text-amber-200/70 mt-2">
                {t('howItWorks.subheading')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              <div className="bg-white/5 border border-amber-300/15 p-6 rounded-2xl backdrop-blur-xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 font-serif font-bold text-xl flex items-center justify-center mb-4 border border-amber-400/30">
                  1
                </div>
                <h3 className="font-serif font-bold text-lg text-amber-100">{t('howItWorks.step1Title')}</h3>
                <p className="text-xs text-amber-200/70 mt-2 leading-relaxed">
                  {t('howItWorks.step1Body')}
                </p>
              </div>

              <div className="bg-white/5 border border-amber-300/15 p-6 rounded-2xl backdrop-blur-xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 font-serif font-bold text-xl flex items-center justify-center mb-4 border border-amber-400/30">
                  2
                </div>
                <h3 className="font-serif font-bold text-lg text-amber-100">{t('howItWorks.step2Title')}</h3>
                <p className="text-xs text-amber-200/70 mt-2 leading-relaxed">
                  {t('howItWorks.step2Body')}
                </p>
              </div>

              <div className="bg-white/5 border border-amber-300/15 p-6 rounded-2xl backdrop-blur-xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 font-serif font-bold text-xl flex items-center justify-center mb-4 border border-amber-400/30">
                  3
                </div>
                <h3 className="font-serif font-bold text-lg text-amber-100">{t('howItWorks.step3Title')}</h3>
                <p className="text-xs text-amber-200/70 mt-2 leading-relaxed">
                  {t('howItWorks.step3Body')}
                </p>
              </div>
            </div>
          </section>

          {/* FAQ Accordion Section (Interactive Expand/Collapse Accordion) */}
          <section className="max-w-3xl mx-auto my-16">
            <h2 className="font-serif font-bold text-2xl text-center text-amber-950 mb-6">
              {t('faq.heading')}
            </h2>
            <div className="space-y-3">
              {(t.raw('faq.items') as { q: string; a: string }[]).map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                      isOpen ? 'bg-amber-50/90 border-amber-800 shadow-sm ring-1 ring-amber-800/20' : 'bg-white/95 border-amber-900/15 hover:border-amber-900/30'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full p-5 text-left font-serif font-bold text-sm text-amber-950 flex items-center justify-between cursor-pointer gap-4"
                    >
                      <span>{faq.q}</span>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-amber-900 text-amber-50 rotate-180' : 'bg-amber-100 text-amber-900'}`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 text-xs text-stone-700 leading-relaxed border-t border-amber-900/10 pt-3.5 animate-in fade-in duration-200">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </main>

        <Footer />
      </SmoothScroll>
    </div>
  );
}