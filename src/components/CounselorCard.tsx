'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight, MessageSquare, Video } from 'lucide-react';
import { Counselor } from '@/types';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import { formatInteger } from '@/lib/format';
import CounselorAvatar from './CounselorAvatar';

export default function CounselorCard({ counselor, demo = false }: { counselor: Counselor; demo?: boolean }) {
  const t = useTranslations('discovery.card');
  const tSpecialties = useTranslations('specialties');
  const locale = useLocale();
  const hasVideo = Number.isFinite(counselor.standardPrice) && counselor.standardPrice > 0;
  const hasText = counselor.pricePerQuestion != null && counselor.pricePerQuestion > 0;
  const price = hasVideo ? counselor.standardPrice : counselor.pricePerQuestion;
  return (
    <article className="ui-panel ui-card p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <CounselorAvatar src={counselor.avatarUrl} name={counselor.fullName} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-snug break-words">{counselor.fullName}</h3>
          <p className="ui-muted mt-1 text-sm leading-relaxed">{counselor.headline}</p>
        </div>
      </div>
      {demo && <span className="ui-status mt-4 self-start">{t('sample')}</span>}
      <div className="mt-5 flex flex-wrap gap-2">
        {counselor.specialties.slice(0, 2).map((specialty) => <span key={specialty} className="rounded-md bg-[#f5efe5] px-2.5 py-1 text-xs font-medium text-[#725738]">
          {Object.hasOwn(SPECIALTY_CONFIG, specialty) ? tSpecialties(specialty) : specialty}
        </span>)}
      </div>
      <p className="ui-muted mt-4 line-clamp-3 text-sm leading-relaxed">{counselor.bio}</p>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-[#65584b]">
        {hasVideo && <span className="inline-flex items-center gap-1.5"><Video size={15} aria-hidden="true" />{t('video')}</span>}
        {hasText && <span className="inline-flex items-center gap-1.5"><MessageSquare size={15} aria-hidden="true" />{t('text')}</span>}
      </div>
      <div className="mt-auto pt-5">
        <div className="border-t border-[#e7ddd0] pt-4">
          <p className="ui-muted text-xs">{t(hasVideo ? 'from' : hasText ? 'questionPrice' : 'noPrice')}</p>
          {price != null && price > 0 && <p className="mt-1 text-xl font-semibold tracking-tight">{formatInteger(price, locale)} <span className="ui-muted text-sm font-normal">{t('currency')}</span></p>}
          <Link href={`/counselors/${encodeURIComponent(counselor.id)}`} className="ui-button-secondary mt-4 w-full" aria-label={`${t('profile')} — ${counselor.fullName}`}>
            {t('profile')}<ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
