'use client';

import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { SPECIALTY_CONFIG } from '@/lib/specialties';

interface CatalogIntroProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedTag: string;
  setSelectedTag: (value: string) => void;
}

export default function CatalogIntro({ searchQuery, setSearchQuery, selectedTag, setSelectedTag }: CatalogIntroProps) {
  const t = useTranslations('discovery.search');
  const tSpecialties = useTranslations('specialties');
  return (
    <section className="ui-container" aria-label={t('filters')}>
      <div className="ui-panel p-4 sm:p-6">
        <label htmlFor="mentor-search" className="ui-label">{t('label')}</label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-[15px] h-5 w-5 text-[#8b7762]" />
          <input id="mentor-search" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('placeholder')} className="ui-input" style={{ paddingLeft: 44, paddingRight: 52 }} />
          {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label={t('clear')}
            className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-[#6d6259] hover:bg-[#f4eee5]">
            <X size={18} aria-hidden="true" />
          </button>}
        </div>
        <div className="mt-4 sm:hidden">
          <label htmlFor="mentor-category" className="ui-label">{t('category')}</label>
          <select id="mentor-category" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="ui-input">
            {Object.keys(SPECIALTY_CONFIG).map((key) => <option key={key} value={key}>{tSpecialties(key)}</option>)}
          </select>
        </div>
        <div className="mt-4 hidden flex-wrap gap-2 sm:flex" role="group" aria-label={t('category')}>
          {Object.keys(SPECIALTY_CONFIG).map((key) => (
            <button key={key} type="button" aria-pressed={selectedTag === key} onClick={() => setSelectedTag(key)} className="ui-filter-chip">
              {tSpecialties(key)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
