'use client';

import { useTranslations } from 'next-intl';

export default function CleanHero() {
  const t = useTranslations('discovery.hero');
  return (
    <section className="ui-container pb-4 pt-4 lg:pb-5 lg:pt-8" aria-labelledby="discovery-title">
      <p className="ui-eyebrow mb-2 hidden lg:block">{t('eyebrow')}</p>
      <h1 id="discovery-title" className="ui-discovery-heading max-w-[760px]">{t('title')}</h1>
      <p className="ui-muted mt-2 max-w-[660px] text-sm leading-relaxed lg:text-lg">{t('body')}</p>
    </section>
  );
}
