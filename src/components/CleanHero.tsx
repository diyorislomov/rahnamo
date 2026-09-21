'use client';

import { Playfair_Display } from 'next/font/google';
import { useTranslations } from 'next-intl';
import { ArrowRight, ArrowDown, Building2, Clock, ShieldCheck, Sparkles, Star, Zap } from 'lucide-react';
import { Counselor } from '@/types';

const playfair = Playfair_Display({ subsets: ['latin', 'latin-ext'], weight: ['700', '800'], display: 'swap' });

interface CleanHeroProps {
  counselors: Counselor[];
}

/**
 * Replaces the earlier night/starfield hero (CinematicHero + HeroHorizon +
 * Starfield) with a light 2-column layout, per direct request. The right
 * column's "featured mentor" card is real data -- whichever counselor in
 * the live list currently has the highest rating, not an invented persona
 * -- and every field on it (response time, company, rating, next slot)
 * only renders when that counselor actually has it, same as CounselorCard.
 * No fabricated trust numbers (no "1,200+ qabullar", no invented ratings):
 * the one floating stat is `counselors.length`, the real count.
 */
export default function CleanHero({ counselors }: CleanHeroProps) {
  const t = useTranslations('hero');
  const tCommon = useTranslations('common');
  const featured = [...counselors].sort((a, b) => b.rating - a.rating)[0];

  return (
    <section className="relative bg-silk-tapestry overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left column -- value proposition */}
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 bg-amber-100/80 border border-amber-300/60 text-amber-900 text-[11px] font-bold uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            {t('badge')}
          </span>

          <h1
            className={`${playfair.className} mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-amber-950 leading-[1.15]`}
          >
            {t.rich('title', {
              strong: (chunks) => <span className="text-amber-700">{chunks}</span>,
            })}
          </h1>

          <p className="mt-5 text-sm sm:text-base text-stone-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            {t('subtitle')}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
            <a
              href="#rahnamolar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-bold text-sm px-6 py-3.5 rounded-2xl shadow-md transition-all"
            >
              <span>{tCommon('viewCounselors')}</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-amber-900/15 hover:border-amber-400/60 text-amber-950 font-bold text-sm px-6 py-3.5 rounded-2xl shadow-xs transition-all"
            >
              <span>{tCommon('howItWorks')}</span>
              <ArrowDown className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Right column -- a real featured mentor, not an invented persona */}
        {featured && (
          <div className="relative mx-auto max-w-sm w-full">
            <div aria-hidden className="absolute -inset-6 bg-amber-400/15 blur-3xl rounded-full" />

            <div className="relative bg-white rounded-3xl border border-amber-900/15 shadow-xl p-6">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-amber-900/10">
                <div className="flex items-center gap-1.5 bg-amber-100/70 text-amber-950 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-amber-300/50">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>{tCommon('verifiedBadge')}</span>
                </div>
                {featured.responseTime && (
                  <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                    <span>{tCommon('responseTimeLabel', { time: featured.responseTime })}</span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-4 mt-4">
                <img
                  src={featured.avatarUrl}
                  alt={featured.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-200 flex-shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-serif font-bold text-base text-amber-950 truncate">{featured.fullName}</h3>
                  <p className="text-xs text-stone-600 mt-0.5 line-clamp-2 leading-relaxed">{featured.headline}</p>
                  {featured.company && (
                    <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-800/80 mt-1 truncate">
                      <Building2 className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{featured.company}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 text-xs font-bold text-amber-900">
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{featured.rating}</span>
                  <span className="text-stone-400 font-normal">({featured.reviewsCount})</span>
                </div>
              </div>

              {featured.availableSlots?.[0] && (
                <div className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                  <span className="truncate">{t('nextSlotLabel', { slot: featured.availableSlots[0] })}</span>
                </div>
              )}

              <a
                href={`/counselors/${featured.id}`}
                className="mt-4 flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-semibold text-xs py-3 rounded-xl shadow-xs transition-all"
              >
                <span>{t('viewProfile')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* The one floating badge -- counselors.length, the real count,
                not an invented booking/rating figure. */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl border border-amber-900/15 shadow-md px-4 py-2.5 hidden sm:flex items-center gap-2">
              <span className="font-serif font-extrabold text-lg text-amber-900">{counselors.length}</span>
              <span className="text-[10px] font-bold text-stone-500 uppercase leading-tight">
                {t('statLabelLine1')}
                <br />
                {t('statLabelLine2')}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
