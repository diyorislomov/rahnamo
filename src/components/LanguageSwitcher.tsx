'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { locales, localeCookieName, type Locale } from '@/i18n/config';

const LABELS: Record<Locale, { short: string; full: string }> = {
  uz: { short: 'UZ', full: 'O‘zbekcha' }, ru: { short: 'RU', full: 'Русский' }, en: { short: 'EN', full: 'English' },
};
function persistLocaleCookie(locale: Locale) {
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const activeLocale = useLocale();
  const t = useTranslations('discovery.nav');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function setLocale(locale: Locale) {
    if (locale === activeLocale) return;
    persistLocaleCookie(locale);
    startTransition(() => router.refresh());
  }
  return <div role="group" aria-label={t('language')} aria-busy={pending} className={`inline-flex gap-1 ${className}`}>
    {locales.map((locale) => <button key={locale} type="button" onClick={() => setLocale(locale)} aria-pressed={locale === activeLocale}
      aria-label={LABELS[locale].full} lang={locale} disabled={pending} title={LABELS[locale].full}
      className={`min-h-11 min-w-11 rounded-lg px-2 text-xs font-semibold disabled:opacity-60 ${locale === activeLocale ? 'bg-[#8b431b] text-white' : 'text-[#6d6259] hover:bg-[#eee4d4]'}`}>{LABELS[locale].short}</button>)}
  </div>;
}
