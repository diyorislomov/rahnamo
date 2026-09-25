'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { SPECIALTY_CONFIG } from '@/lib/specialties';

interface CatalogIntroProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedTag: string;
  setSelectedTag: (value: string) => void;
  companies: { value: string; label: string }[];
  selectedCompany: string;
  setSelectedCompany: (value: string) => void;
  selectedSort: string;
  setSelectedSort: (value: string) => void;
}

export default function CatalogIntro({ searchQuery, setSearchQuery, selectedTag, setSelectedTag, companies, selectedCompany, setSelectedCompany, selectedSort, setSelectedSort }: CatalogIntroProps) {
  const t = useTranslations('discovery.search');
  const tSpecialties = useTranslations('specialties');
  const activeCount = Number(selectedTag !== 'All') + Number(!!selectedCompany) + Number(selectedSort !== 'name');
  return (
    <section className="ui-container" aria-label={t('filters')}>
      <div className="lg:rounded-2xl lg:border lg:border-[#e7ddd0] lg:bg-white lg:p-4">
        <label htmlFor="mentor-search" className="ui-label">{t('label')}</label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-[15px] h-5 w-5 text-[#8b7762]" />
          <input id="mentor-search" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('placeholder')} className="ui-input" autoComplete="off" enterKeyHint="search" style={{ paddingLeft: 44, paddingRight: 52 }} />
          {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label={t('clear')}
            className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-[#6d6259] hover:bg-[#f4eee5]">
            <X size={18} aria-hidden="true" />
          </button>}
        </div>
        <details className="group mt-2" name="mentor-filters">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold text-[#713614] [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal size={17} aria-hidden="true" />
            <span>{t('toggle')}</span>
            {activeCount > 0 && <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#efe5d5] px-1.5 py-0.5 text-xs" aria-label={t('active', { count: activeCount })}>{activeCount}</span>}
            <ChevronDown size={16} aria-hidden="true" className="ml-auto group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 border-t border-[#e7ddd0] pb-2 pt-4 sm:grid-cols-3">
            <div className="min-w-0">
              <label htmlFor="mentor-category" className="ui-label">{t('category')}</label>
              <select id="mentor-category" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="ui-input">
                {Object.keys(SPECIALTY_CONFIG).map((key) => <option key={key} value={key}>{tSpecialties(key)}</option>)}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="company-filter" className="ui-label">{t('company')}</label>
              <select id="company-filter" className="ui-input" value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
                <option value="">{t('allCompanies')}</option>
                {companies.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="mentor-sort" className="ui-label">{t('sort')}</label>
              <select id="mentor-sort" className="ui-input" value={selectedSort} onChange={(e) => setSelectedSort(e.target.value)}>
                <option value="name">{t('name')}</option><option value="price-low">{t('low')}</option><option value="price-high">{t('high')}</option>
              </select>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
