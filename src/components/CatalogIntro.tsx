'use client';

import { useTranslations } from 'next-intl';
import { Search, SlidersHorizontal, Info } from 'lucide-react';
import { Counselor } from '@/types';
import { SPECIALTY_CONFIG } from '@/lib/specialties';

export type SortOption = 'rating' | 'popular' | 'price-low' | 'price-high';

interface CatalogIntroProps {
  counselors: Counselor[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedTag: string;
  setSelectedTag: (value: string) => void;
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
  specialtyKeys: string[];
}

export default function CatalogIntro({
  searchQuery,
  setSearchQuery,
  selectedTag,
  setSelectedTag,
  sortBy,
  setSortBy,
  specialtyKeys,
}: CatalogIntroProps) {
  const t = useTranslations('catalogIntro');
  const tHome = useTranslations('home');
  const tSpecialties = useTranslations('specialties');

  return (
    <section id="search-filters" className="scroll-mt-24 pt-12 pb-4 border-t border-black/[0.05]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-8">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono font-bold text-xs text-[#14171A]">05</span>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#8B9298]">
                {t('eyebrow')}
              </span>
            </div>
            <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-[#14171A] leading-[1.05] tracking-[-0.04em]">
              {t('heading')}
            </h2>
          </div>
          <div className="lg:col-span-7 lg:pt-8">
            <p className="text-sm sm:text-base text-[#52585C] max-w-2xl leading-relaxed">
              {t('subheading')}
            </p>
          </div>
        </div>

        {/* Editorial Search & Filter Bar */}
        <div className="rounded-3xl bg-white p-5 sm:p-7 shadow-[0_14px_44px_-16px_rgba(20,23,26,0.08)] border border-black/[0.05]">
          <div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#787F84] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="catalog-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  aria-label={t('searchLabel')}
                  className="w-full pl-11 pr-20 py-3.5 bg-[#FAF7F2] border border-black/[0.08] rounded-2xl text-xs sm:text-sm text-[#14171A] outline-none focus:border-[#E06D1A] focus:bg-white transition-all placeholder:text-[#787F84]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#52585C] hover:text-[#14171A] font-semibold px-2 py-1 rounded-lg hover:bg-[#FAF7F2] cursor-pointer"
                  >
                    ✕ {t('clearSearch')}
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex items-center gap-2 bg-[#FAF7F2] border border-black/[0.08] rounded-2xl px-4 py-3.5 w-full md:w-auto">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#E06D1A] shrink-0" />
                  <label htmlFor="catalog-sort" className="sr-only">
                    {tHome('sortLabel')}
                  </label>
                  <select
                    id="catalog-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-transparent text-xs font-bold text-[#14171A] outline-none cursor-pointer w-full"
                  >
                    <option value="rating">{tHome('sortOptions.rating')}</option>
                    <option value="popular">{tHome('sortOptions.popular')}</option>
                    <option value="price-low">{tHome('sortOptions.priceLow')}</option>
                    <option value="price-high">{tHome('sortOptions.priceHigh')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-4 border-t border-black/[0.05] pb-1 no-scrollbar">
              {specialtyKeys.map((key) => {
                const isSelected = selectedTag === key;
                const config = SPECIALTY_CONFIG[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTag(key)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#14171A] text-white shadow-xs'
                        : 'bg-[#FAF7F2] text-[#52585C] border border-black/[0.06] hover:border-black/20 hover:text-[#14171A]'
                    }`}
                  >
                    {config?.icon && <span>{config.icon}</span>}
                    <span>{tSpecialties(key)}</span>
                  </button>
                );
              })}
            </div>

            {/* Beta Info Strip */}
            <div className="mt-4 pt-3 border-t border-black/[0.05] flex items-center gap-2 text-[11px] text-[#52585C]">
              <Info className="w-3.5 h-3.5 text-[#E06D1A] shrink-0" />
              <span>{t('betaBanner')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
