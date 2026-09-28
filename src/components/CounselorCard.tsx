'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, UserRound } from 'lucide-react';
import { Counselor } from '@/types';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import { useTilt } from '@/hooks/useTilt';

// Deliberately uncluttered: avatar, name, one specialty label, a short
// description, one price, one CTA. Rating/verified badge/outcomes/company
// all still live on the full profile page (src/app/counselors/[id]/page.tsx)
// -- this card's job is to get someone to that page, not repeat it.
export default function CounselorCard({ counselor }: { counselor: Counselor }) {
  const { ref, tiltProps } = useTilt<HTMLDivElement>();
  const t = useTranslations('counselorCard');
  const tSpecialties = useTranslations('specialties');

  // specialties[0] is always a real SPECIALTY_CONFIG key by convention
  // (become-counselor's category picker leads the array) -- falls back to
  // the raw text for the rare case it isn't one.
  const primarySpecialty = counselor.specialties[0];
  const specialtyConfig = SPECIALTY_CONFIG[primarySpecialty];

  return (
    <div
      ref={ref}
      {...tiltProps}
      className="tilt-card relative bg-white/95 rounded-3xl border border-amber-900/15 p-6 shadow-sm hover:shadow-xl hover:shadow-amber-950/10 hover:border-amber-400/80 flex flex-col group h-full"
    >
      {/* Pointer-following warm sheen (desktop only; opacity stays 0 otherwise) */}
      <span aria-hidden className="tilt-card__sheen" />

      <div className="relative flex-1">
        <div className="flex items-start gap-4">
          {counselor.avatarUrl ? (
            <img
              src={counselor.avatarUrl}
              alt={counselor.fullName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-200 shadow-xs group-hover:border-amber-400 group-hover:scale-105 transition-all flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-amber-200 flex items-center justify-center flex-shrink-0">
              <UserRound className="w-7 h-7 text-amber-700" />
            </div>
          )}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-serif font-bold text-base text-amber-950 group-hover:text-amber-800 transition-colors truncate">
              {counselor.fullName}
            </h3>
            {specialtyConfig ? (
              <p className="text-xs font-semibold text-amber-800 mt-0.5">
                {specialtyConfig.icon} {tSpecialties(primarySpecialty)}
              </p>
            ) : (
              <p className="text-xs font-semibold text-amber-800 mt-0.5 truncate">{primarySpecialty}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-stone-600 mt-3 line-clamp-2 leading-relaxed">{counselor.bio}</p>
      </div>

      {/* Footer -- one price, one CTA */}
      <div className="relative mt-4 pt-4 border-t border-amber-900/10 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-stone-400 block">{t('priceLabel')}</span>
          <div className="text-sm font-serif font-extrabold text-amber-950">
            {counselor.standardPrice.toLocaleString()}{' '}
            <span className="text-[10px] font-normal text-stone-500">{t('priceUnit')}</span>
          </div>
        </div>

        <Link
          href={`/counselors/${counselor.id}`}
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-semibold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all group-hover:gap-2"
        >
          <span>{t('viewProfile')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
