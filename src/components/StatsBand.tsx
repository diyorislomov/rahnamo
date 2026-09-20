'use client';

import { useMemo } from 'react';
import { Counselor } from '@/types';
import { SPECIALTY_CONFIG } from '@/lib/specialties';

interface StatsBandProps {
  counselors: Counselor[];
}

/**
 * Every number here is derived from the same live `counselors` list the
 * catalog below already renders -- never hardcoded, never a marketing
 * claim Rahnamo has no data to back up. If a stat would read as 0 or
 * embarrassingly thin, it's left out of the `stats` array entirely rather
 * than shown.
 */
export default function StatsBand({ counselors }: StatsBandProps) {
  const stats = useMemo(() => {
    const counselorCount = counselors.length;

    const categoryKeys = Object.keys(SPECIALTY_CONFIG).filter((k) => k !== 'All');
    const coveredCategories = categoryKeys.filter((key) =>
      counselors.some((c) => c.specialties.includes(key))
    ).length;

    const distinctSpecialties = new Set(counselors.flatMap((c) => c.specialties)).size;

    const entries: { value: number; label: string }[] = [];
    if (counselorCount > 0) entries.push({ value: counselorCount, label: 'Rahnamolar' });
    if (coveredCategories > 0) entries.push({ value: coveredCategories, label: "Yo'nalishlar" });
    if (distinctSpecialties > 0) entries.push({ value: distinctSpecialties, label: 'Ixtisoslik sohalari' });

    return entries;
  }, [counselors]);

  if (stats.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="relative overflow-hidden rounded-2xl bg-white/95 border border-amber-900/15 shadow-sm px-5 py-4 sm:py-5 text-center"
          >
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center font-serif font-black text-amber-950/[0.06] text-[5rem] sm:text-[6.5rem] leading-none select-none"
            >
              {stat.value}
            </span>
            <div className="relative z-10">
              <div className="font-serif font-extrabold text-2xl sm:text-3xl text-amber-950">{stat.value}</div>
              <div className="text-xs sm:text-sm font-bold text-stone-600 mt-1 uppercase tracking-wide">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
