'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Star, ShieldCheck, ArrowRight, CheckCircle2, Zap, Building2 } from 'lucide-react';
import { Counselor } from '@/types';
import { useTilt } from '@/hooks/useTilt';

export default function CounselorCard({ counselor }: { counselor: Counselor }) {
  const { ref, tiltProps } = useTilt<HTMLDivElement>();
  const t = useTranslations('counselorCard');
  const tCommon = useTranslations('common');

  return (
    <div
      ref={ref}
      {...tiltProps}
      className="tilt-card relative bg-white/95 rounded-3xl border border-amber-900/15 p-6 shadow-sm hover:shadow-xl hover:shadow-amber-950/10 hover:border-amber-400/80 flex flex-col group"
    >
      {/* Pointer-following warm sheen (desktop only; opacity stays 0 otherwise) */}
      <span aria-hidden className="tilt-card__sheen" />

      {/* flex-1: content above varies a lot (company/outcomes/response-time
          are only ever set on the 6 seeded mock counselors, never on a
          freshly-approved one) -- this grows to absorb that difference so
          the footer below stays pinned via mt-auto instead of floating at
          an inconsistent height whenever a row's cards are stretched to
          equal height by the grid. */}
      <div className="relative flex-1">
        {/* Top Row: Verified Badge & Response Time */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-amber-900/10">
          <div className="flex items-center gap-1.5 bg-amber-100/70 text-amber-950 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-amber-300/50">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700 fill-amber-100" />
            <span>{tCommon('verifiedBadge')}</span>
          </div>

          {counselor.responseTime && (
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
              <span>{tCommon('responseTimeLabel', { time: counselor.responseTime })}</span>
            </div>
          )}
        </div>

        {/* Avatar & Name Header */}
        <div className="flex items-start gap-4">
          <img
            src={counselor.avatarUrl}
            alt={counselor.fullName}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-200 shadow-xs group-hover:border-amber-400 group-hover:scale-105 transition-all flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-base text-amber-950 group-hover:text-amber-800 transition-colors truncate">
              {counselor.fullName}
            </h3>
            <p className="text-xs text-stone-600 mt-0.5 line-clamp-2 leading-relaxed">
              {counselor.headline}
            </p>

            {counselor.company && (
              <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-800/80 mt-1 truncate">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{counselor.company}</span>
              </p>
            )}

            {/* Rating & Total Sessions */}
            <div className="flex items-center gap-2 mt-2 text-xs font-bold text-amber-900">
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{counselor.rating}</span>
                <span className="text-stone-400 font-normal">({counselor.reviewsCount})</span>
              </div>
              {counselor.totalSessions && (
                <span className="text-[10px] text-stone-500 font-normal truncate">
                  • {t('sessionsCount', { count: counselor.totalSessions })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio Snippet */}
        <p className="text-xs text-stone-600 mt-4 line-clamp-3 leading-relaxed border-t border-amber-900/10 pt-3">
          {counselor.bio}
        </p>

        {/* Outcome Badges */}
        {counselor.outcomes && counselor.outcomes.length > 0 && (
          <div className="mt-3 space-y-1">
            {counselor.outcomes.map((outcome) => (
              <div
                key={outcome}
                className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/50"
              >
                <CheckCircle2 className="w-3 h-3 text-amber-700 flex-shrink-0" />
                <span className="truncate">{outcome}</span>
              </div>
            ))}
          </div>
        )}

        {/* Specialty Tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {counselor.specialties.map((s) => (
            <span
              key={s}
              className="bg-amber-100/60 text-amber-950 text-[10px] font-medium px-2.5 py-0.5 rounded-md border border-amber-300/40"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Footer Action Card -- mt-auto pins it to the bottom regardless of
          how tall the content above ends up being. */}
      <div className="relative mt-auto pt-4 border-t border-amber-900/10 flex items-center justify-between">
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
          <span>{t('selectTime')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
