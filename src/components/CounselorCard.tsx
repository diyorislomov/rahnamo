'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  ArrowUpRight,
  Building2,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Zap,
} from 'lucide-react';
import { Counselor } from '@/types';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import { useTilt } from '@/hooks/useTilt';

function inferMentorRoots(counselor: Counselor): string {
  const text = `${counselor.headline} ${counselor.company || ''} ${counselor.specialties.join(' ')}`.toLowerCase();
  if (text.includes('ankara') || text.includes('germany') || text.includes('turkey')) {
    return 'Tashkent / Berlin & Ankara';
  }
  if (text.includes('leiden') || text.includes('ll.m')) {
    return 'Tashkent / Leiden';
  }
  if (text.includes('fulbright') || text.includes('scholarship')) {
    return 'Tashkent / New York';
  }
  if (text.includes('architect') && text.includes('software')) {
    return 'Tashkent / Munich';
  }
  if (text.includes('studio') || text.includes('design')) {
    return 'Samarkand / Tashkent';
  }
  return 'Tashkent • Silk Road Hub';
}

export default function CounselorCard({ counselor }: { counselor: Counselor }) {
  const { ref, tiltProps } = useTilt<HTMLDivElement>();
  const t = useTranslations('counselorCard');
  const tCommon = useTranslations('common');
  const tHero = useTranslations('hero');
  const tSpecialties = useTranslations('specialties');

  const primarySpecialty = counselor.specialties[0];
  const specialtyConfig = SPECIALTY_CONFIG[primarySpecialty];
  const nextSlot = counselor.availableSlots?.[0];
  const roots = inferMentorRoots(counselor);
  const sessionsCount = counselor.totalSessions ?? counselor.reviewsCount ?? 0;
  const isNew = sessionsCount === 0 || !counselor.rating || counselor.rating === 0;

  return (
    <div
      ref={ref}
      {...tiltProps}
      className="yv-card tilt-card h-full group flex flex-col"
    >
      <div className="yv-card-inner p-6 flex flex-col justify-between h-full relative overflow-hidden">
        <span aria-hidden="true" className="tilt-card__sheen" />
        <div className="uzc-dot-corner" aria-hidden="true" />

        <div className="relative z-10 flex-1 flex flex-col">
          {/* Top Social Proof Strip: ADPList-style Rating + Sessions Count & Fast Response Badge */}
          <div className="flex items-center justify-between gap-2 pb-3.5 mb-4 border-b border-[#0F1E36]/[0.08]">
            {isNew ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs font-bold text-[#92400E]">
                <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                <span>{t('newMentor')}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FBF9F5] border border-[#F59E0B]/40 text-xs font-bold text-[#0F1E36]">
                <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                <span>{counselor.rating.toFixed(1)}</span>
                <span className="text-[#64748B] font-medium">
                  • {t('sessionsCount', { count: sessionsCount })}
                </span>
              </div>
            )}

            {counselor.responseTime && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#C25E38]/10 border border-[#C25E38]/25 text-[#C25E38] text-[10px] font-mono font-bold">
                <Zap className="w-3 h-3 fill-[#C25E38] text-[#C25E38]" />
                <span>{tCommon('responseTimeLabel', { time: counselor.responseTime })}</span>
              </span>
            )}
          </div>

          {/* Mentor Identity Row: Portrait + Verified Badge + Roots + Credibility Tag */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {counselor.avatarUrl ? (
                <Image
                  src={counselor.avatarUrl}
                  alt={counselor.fullName}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#F59E0B]/50 group-hover:border-[#0F1E36] transition-colors shadow-xs"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#FBF9F5] border border-[#F59E0B]/40 flex items-center justify-center">
                  <UserRound className="w-7 h-7 text-[#0F1E36]" />
                </div>
              )}
              <span
                title={tCommon('verifiedBadge')}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0F1E36] text-[#F59E0B] flex items-center justify-center ring-2 ring-white"
              >
                <ShieldCheck className="w-3 h-3" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-display font-bold text-base sm:text-lg text-[#0F1E36] group-hover:text-[#D97706] transition-colors truncate tracking-[-0.02em]">
                {counselor.fullName}
              </h3>

              <p className="text-xs text-[#475569] line-clamp-2 mt-0.5 leading-snug">
                {counselor.headline}
              </p>

              {/* Roots & Verified Company / Institution Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {counselor.company && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0F1E36] text-white text-[10px] font-bold">
                    <Building2 className="w-3 h-3 text-[#F59E0B] shrink-0" />
                    <span className="truncate max-w-[140px]">{counselor.company}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FBF9F5] border border-[#0F1E36]/10 text-[10px] font-semibold text-[#475569]">
                  <MapPin className="w-2.5 h-2.5 text-[#C25E38] shrink-0" />
                  <span className="truncate">{roots}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Specialty Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-4">
            {specialtyConfig ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F59E0B]/15 border border-[#D97706]/30 text-[#92400E] text-[11px] font-bold">
                <span>{specialtyConfig.icon}</span>
                <span>{tSpecialties(primarySpecialty)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#0F1E36]/[0.07] text-[#0F1E36] text-[11px] font-bold">
                {primarySpecialty}
              </span>
            )}
            {counselor.specialties.slice(1, 3).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full bg-[#FBF9F5] border border-[#0F1E36]/10 text-[#475569] text-[11px] font-medium truncate max-w-[155px]"
              >
                {SPECIALTY_CONFIG[tag] ? tSpecialties(tag) : tag}
              </span>
            ))}
          </div>

          {/* Bio Excerpt */}
          <p className="text-xs text-[#475569] mt-3.5 line-clamp-2 leading-relaxed">
            {counselor.bio}
          </p>

          {/* Next Available Slot */}
          {nextSlot && (
            <div className="mt-3.5 flex items-center gap-2 text-[11px] font-semibold text-[#0F1E36] bg-[#FBF9F5] border border-[#0F1E36]/10 rounded-xl px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
              <span className="truncate">{tHero('nextSlotLabel', { slot: nextSlot })}</span>
            </div>
          )}
        </div>

        {/* Footer: Session Pricing + Direct Booking Trigger */}
        <div className="relative z-10 mt-5 pt-4 border-t border-[#0F1E36]/10 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#64748B] block">
              {t('priceLabel')}
            </span>
            <div className="font-display font-extrabold text-base text-[#0F1E36] tracking-[-0.02em]">
              {counselor.standardPrice.toLocaleString()}{' '}
              <span className="text-[11px] font-sans font-medium text-[#475569]">
                {t('priceUnit')}
              </span>
            </div>
          </div>

          <Link
            href={`/counselors/${counselor.id}`}
            className="btn-yv-primary !py-1 !pl-4 !pr-1 !text-xs"
          >
            <span>{t('selectTime')}</span>
            <span className="badge !w-8 !h-8" aria-hidden="true">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
