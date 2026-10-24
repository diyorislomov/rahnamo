'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { locales, localeCookieName, Locale } from '@/i18n/config';

const SHORT_LABELS: Record<Locale, string> = {
  uz: 'UZ',
  ru: 'RU',
  en: 'EN',
};

const FULL_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
};

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const router = useRouter();
  const current = useLocale() as Locale;
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Locale>(current);

  const select = (next: Locale) => {
    if (next === optimistic) return;
    setOptimistic(next);
    document.cookie = `${localeCookieName}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center gap-1.5 text-xs font-medium tracking-wide select-none ${className}`}
    >
      {locales.map((loc: Locale, idx: number) => {
        const active = loc === optimistic;
        return (
          <span key={loc} className="inline-flex items-center gap-1.5">
            {idx > 0 && (
              <span aria-hidden="true" className="text-[#252A2D]/20 font-light">
                |
              </span>
            )}
            <button
              type="button"
              onClick={() => select(loc)}
              disabled={pending}
              title={FULL_LABELS[loc]}
              aria-pressed={active}
              className={`px-1 py-0.5 transition-colors cursor-pointer ${
                active
                  ? 'text-[#14171A] font-bold'
                  : 'text-[#8B9298] hover:text-[#14171A] font-medium'
              }`}
            >
              {SHORT_LABELS[loc]}
            </button>
          </span>
        );
      })}
    </div>
  );
}
