'use client';

import { useTranslations } from 'next-intl';

export default function CleanHero() {
  const t = useTranslations('discovery.hero');
  return (
    <section className="ui-container pb-6 pt-9 sm:pb-8 sm:pt-14" aria-labelledby="discovery-title">
      <p className="ui-eyebrow mb-3">{t('eyebrow')}</p>
      <h1 id="discovery-title" className="ui-discovery-heading max-w-[760px]">{t('title')}</h1>
      <p className="ui-muted mt-4 max-w-[660px] text-base sm:text-lg">{t('body')}</p>
    </section>
  );
}
