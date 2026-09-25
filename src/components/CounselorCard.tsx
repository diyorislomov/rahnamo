'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import { Counselor } from '@/types';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import { formatInteger } from '@/lib/format';
import { getCounselorContent } from '@/lib/counselor-content';
import CounselorAvatar from './CounselorAvatar';

export default function CounselorCard({ counselor, demo = false }: { counselor: Counselor; demo?: boolean }) {
  const t = useTranslations('discovery.card');
  const tSpecialties = useTranslations('specialties');
  const locale = useLocale();
  const content = getCounselorContent(counselor, locale, demo);
  const hasVideo = Number.isFinite(counselor.standardPrice) && counselor.standardPrice > 0;
  const hasText = counselor.pricePerQuestion != null && Number.isFinite(counselor.pricePerQuestion) && counselor.pricePerQuestion > 0;
  const price = hasVideo ? counselor.standardPrice : hasText ? counselor.pricePerQuestion : undefined;
  return (
    <article className="ui-panel ui-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <CounselorAvatar src={counselor.avatarUrl} name={counselor.fullName} className="h-14 w-14 sm:h-16 sm:w-16" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-snug break-words">{counselor.fullName}</h3>
          <p className="ui-muted mt-1 text-sm leading-snug">{counselor.specialties[0] && Object.hasOwn(SPECIALTY_CONFIG, counselor.specialties[0]) ? tSpecialties(counselor.specialties[0]) : content.headline}</p>
        </div>
      </div>
      <p className="ui-muted mb-4 mt-3 line-clamp-3 text-sm leading-relaxed">{content.help}</p>
      <div className="mt-auto border-t border-[#e7ddd0] pt-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="ui-muted text-xs">{t(hasVideo ? 'from' : hasText ? 'questionPrice' : 'noPrice')}</p>
            {price != null && price > 0 && <p className="mt-1 text-xl font-semibold tracking-tight">{formatInteger(price, locale)} <span className="ui-muted text-sm font-normal">{t('currency')}</span></p>}
          </div>
          {demo && <span className="ui-status self-center">{t('sample')}</span>}
        </div>
        <Link href={`/counselors/${encodeURIComponent(counselor.id)}`} className="ui-button-secondary mt-3 w-full" aria-label={`${t('profile')} — ${counselor.fullName}`}>
          {t('profile')}<ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
