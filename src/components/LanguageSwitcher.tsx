'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { locales, localeCookieName, type Locale } from '@/i18n/config';

const LABELS: Record<Locale, string> = {
  uz: 'UZ',
  ru: 'RU',
  en: 'EN',
};

// Kept as a plain module-level function, not inlined into the component --
// the React Compiler's lint rules disallow mutating anything external
// (here, `document`) from code lexically inside a component/hook, even in
// an event handler with no render-safety concern.
function persistLocaleCookie(locale: Locale) {
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

// Cookie-only switch, deliberately -- no locale segment in the URL, so
// switching language can never change or break a link someone already has
// (a shared booking URL, a bookmark, anything stored in the database).
// router.refresh() re-runs the server tree (root layout re-reads the
// cookie) without a full page reload and without touching the URL.
export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const activeLocale = useLocale();
  const router = useRouter();

  const setLocale = (locale: Locale) => {
    if (locale === activeLocale) return;
    persistLocaleCookie(locale);
    router.refresh();
  };

  return (
    <div className={`inline-flex items-center gap-0.5 rounded-lg border border-amber-900/15 bg-amber-50/70 p-0.5 ${className}`}>
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => setLocale(locale)}
          aria-current={locale === activeLocale}
          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            locale === activeLocale
              ? 'bg-amber-900 text-amber-50 shadow-xs'
              : 'text-stone-600 hover:bg-amber-100/70'
          }`}
        >
          {LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
