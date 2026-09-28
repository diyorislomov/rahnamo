'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, ArrowRight, SlidersHorizontal, ChevronDown, Info } from 'lucide-react';
import { Counselor } from '@/types';
import StatsBand from './StatsBand';

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

/**
 * The light, spacious landing moment between the cinematic hero and the
 * results grid -- statement -> trust stats -> one search-and-filter card ->
 * a beta notice -> the results grid below. Built entirely from Rahnamo's
 * existing cream/amber palette and existing type stack; this is a layout
 * change, not a new visual language.
 *
 * The old icon-tile "browse by specialty" grid is gone -- category and sort
 * now live as two dropdowns inside one collapsible "Filters" row, alongside
 * search, matching a single toolbar rather than three separate blocks
 * (search card, then a sort+company card, then the results heading) the
 * way this section used to read.
 */
export default function CatalogIntro({
  counselors,
  searchQuery,
  setSearchQuery,
  selectedTag,
  setSelectedTag,
  sortBy,
  setSortBy,
  specialtyKeys,
}: CatalogIntroProps) {
  const t = useTranslations('catalogIntro');
  const tCommon = useTranslations('common');
  const tHome = useTranslations('home');
  const tSpecialties = useTranslations('specialties');
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="bg-[#FAF6EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6">
        {/* Statement + dual CTA */}
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800">
            {t('eyebrow')}
          </p>
          <h2 className="font-serif font-extrabold text-2xl sm:text-4xl text-amber-950 mt-2 leading-tight">
            {t('heading')}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-3 max-w-xl mx-auto leading-relaxed">
            {t('subheading')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-5">
            <a
              href="#rahnamolar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-bold text-sm px-6 py-3.5 rounded-2xl shadow-md transition-all"
            >
              <span>{tCommon('viewCounselors')}</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#search-filters"
              onClick={() => setFiltersOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-amber-900/15 hover:border-amber-400/60 text-amber-950 font-bold text-sm px-6 py-3.5 rounded-2xl shadow-xs transition-all"
            >
              <span>{t('ctaSecondary')}</span>
              <SlidersHorizontal className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Trust stats -- StatsBand exactly as already built, just moved here */}
        <div className="mt-7 sm:mt-9">
          <StatsBand counselors={counselors} />
        </div>

        {/* Search + Filters, one toolbar card */}
        <div id="search-filters" className="max-w-2xl mx-auto mt-8 scroll-mt-24">
          <div className="bg-white border border-amber-900/15 rounded-3xl shadow-sm p-5 sm:p-6">
            <label htmlFor="catalog-search" className="text-xs font-bold text-amber-950 block mb-2">
              {t('searchLabel')}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="catalog-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-11 pr-4 py-3.5 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs sm:text-sm text-stone-800 outline-none focus:ring-2 focus:ring-amber-700 transition-all placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 font-bold cursor-pointer"
                >
                  ✕ {t('clearSearch')}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              aria-expanded={filtersOpen}
              className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{t('filtersToggle')}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>

            {filtersOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-amber-900/10 animate-in fade-in slide-in-from-top-1 duration-200">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                    {t('specialtyFilterLabel')}
                  </label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700 cursor-pointer"
                  >
                    {specialtyKeys.map((key) => (
                      <option key={key} value={key}>
                        {tSpecialties(key)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                    {tHome('sortLabel')}
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700 cursor-pointer"
                  >
                    <option value="rating">{tHome('sortOptions.rating')}</option>
                    <option value="popular">{tHome('sortOptions.popular')}</option>
                    <option value="price-low">{tHome('sortOptions.priceLow')}</option>
                    <option value="price-high">{tHome('sortOptions.priceHigh')}</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Beta notice -- a step deeper than the page background so it
              reads as its own band, still the same warm/amber family. */}
          <div className="mt-4 flex items-center gap-2.5 bg-amber-100/70 border border-amber-300/50 text-amber-900 text-[11px] sm:text-xs font-medium px-4 py-3 rounded-2xl">
            <Info className="w-4 h-4 flex-shrink-0 text-amber-700" />
            <span>{t('betaBanner')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
