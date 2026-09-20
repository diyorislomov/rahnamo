'use client';

import { Search, ArrowRight, ArrowDown } from 'lucide-react';
import { Counselor } from '@/types';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import StatsBand from './StatsBand';

interface CatalogIntroProps {
  counselors: Counselor[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedTag: string;
  setSelectedTag: (value: string) => void;
}

/**
 * The light, spacious landing moment between the cinematic hero and the
 * results grid -- Preplaced's layout rhythm (statement -> trust stats ->
 * search -> browse-by-category), but built entirely from Rahnamo's existing
 * cream/amber palette and existing type stack. No new colors, no new fonts.
 *
 * StatsBand is rendered here as-is, not rebuilt -- it stays its own already
 * -verified component, just repositioned. Everything in this file lives in
 * one continuous bg-[#FAF6EE] region so the statement, the stats, the
 * search, and the discipline grid read as one section, not several
 * competing bands.
 */
export default function CatalogIntro({
  counselors,
  searchQuery,
  setSearchQuery,
  selectedTag,
  setSelectedTag,
}: CatalogIntroProps) {
  return (
    <div className="bg-[#FAF6EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6">
        {/* Statement + dual CTA */}
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800">
            1-ga-1 shaxsiy mentorlik
          </p>
          <h2 className="font-serif font-extrabold text-2xl sm:text-4xl text-amber-950 mt-2 leading-tight">
            O&apos;z sohangizdagi haqiqiy mutaxassis bilan bevosita suhbatlashing.
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-3 max-w-xl mx-auto leading-relaxed">
            Tasdiqlangan Rahnamolar orasidan tanlang, vaqt band qiling va bir hafta ichida birinchi
            konsultatsiyangizni o&apos;tkazing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-5">
            <a
              href="#rahnamolar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-bold text-sm px-6 py-3.5 rounded-2xl shadow-md transition-all"
            >
              <span>Rahnamolarni ko&apos;rish</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#discipline-grid"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-amber-900/15 hover:border-amber-400/60 text-amber-950 font-bold text-sm px-6 py-3.5 rounded-2xl shadow-xs transition-all"
            >
              <span>Yo&apos;nalish bo&apos;yicha tanlash</span>
              <ArrowDown className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Trust stats -- StatsBand exactly as already built, just moved here */}
        <div className="mt-7 sm:mt-9">
          <StatsBand counselors={counselors} />
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ism, soha yoki kalit so'z bo'yicha qidirish (masalan: Fulbright, Legal)..."
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-amber-900/15 rounded-2xl text-xs sm:text-sm text-stone-800 outline-none focus:ring-2 focus:ring-amber-700 transition-all placeholder:text-stone-400 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 font-bold cursor-pointer"
              >
                ✕ Tozalash
              </button>
            )}
          </div>
        </div>

        {/* Discipline grid -- primary category selector, replaces the old pill row */}
        <div id="discipline-grid" className="mt-6 scroll-mt-24">
          <h3 className="text-center font-serif font-bold text-lg text-amber-950 mb-4">
            Yo&apos;nalish bo&apos;yicha tanlang
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.keys(SPECIALTY_CONFIG).map((key) => {
              const cfg = SPECIALTY_CONFIG[key];
              const isSelected = selectedTag === key;
              const count =
                key === 'All' ? counselors.length : counselors.filter((c) => c.specialties.includes(key)).length;

              return (
                <a
                  key={key}
                  href="#rahnamolar"
                  onClick={() => setSelectedTag(key)}
                  className={`flex flex-col items-center justify-center gap-1.5 text-center px-3 py-6 rounded-2xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                    isSelected ? cfg.activeClass : cfg.inactiveClass
                  }`}
                >
                  <span className="text-2xl">{cfg.icon}</span>
                  <span>{cfg.label}</span>
                  <span className="text-[10px] font-normal opacity-70">{count} Rahnamo</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
