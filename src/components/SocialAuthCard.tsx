'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Lock, Send } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { safeRedirectPath } from '@/lib/safeRedirect';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4L15.4 17c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.5H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.5l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6A6 6 0 0 1 12 6Z" />
    </svg>
  );
}

export default function SocialAuthCard({ mode }: { mode: 'login' | 'signup' }) {
  const t = useTranslations('menteeAuth.social');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const redirectTo = safeRedirectPath(searchParams.get('redirect'), '/my-bookings');
  const [pending, setPending] = useState<'google' | 'telegram' | null>(null);
  const [providers, setProviders] = useState<Set<string> | null>(null);
  const hasError = Boolean(searchParams.get('error'));

  useEffect(() => {
    if (status === 'authenticated') router.replace(redirectTo);
  }, [redirectTo, router, status]);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/providers')
      .then((response) => response.json())
      .then((result) => {
        if (active) setProviders(new Set(Object.keys(result || {})));
      })
      .catch(() => {
        if (active) setProviders(new Set());
      });
    return () => {
      active = false;
    };
  }, []);

  async function start(provider: 'google' | 'telegram') {
    setPending(provider);
    await signIn(provider, { callbackUrl: redirectTo });
    setPending(null);
  }

  if (status === 'loading' || status === 'authenticated') {
    return <div className="min-h-screen bg-[#FFF8E7]" />;
  }

  return (
    <div className="min-h-screen bg-[#FFF8E7] text-[#18181B] font-sans antialiased flex flex-col justify-between">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-16 w-full">
        <div className="surface-card p-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-[#0F4C5C] text-white flex items-center justify-center mx-auto shadow-2xs">
            <Lock className="w-5 h-5 text-[#D4A84B]" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0F4C5C] bg-[#0F4C5C]/[0.08] px-3 py-1 rounded-full">
              {t('badge')}
            </span>
            <h1 className="font-serif font-bold text-2xl text-zinc-900 mt-3">
              {mode === 'signup' ? t('signupTitle') : t('loginTitle')}
            </h1>
            <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
              {mode === 'signup' ? t('signupSubtitle') : t('loginSubtitle')}
            </p>
          </div>

          <div className="space-y-3">
            {providers?.has('google') && (
              <button
                type="button"
                onClick={() => start('google')}
                disabled={pending !== null}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-zinc-900/15 bg-white hover:bg-[#F5EFE0] text-zinc-900 text-sm font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {pending === 'google' ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
                <span>{t('google')}</span>
              </button>
            )}
            {providers?.has('telegram') && (
              <button
                type="button"
                onClick={() => start('telegram')}
                disabled={pending !== null}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-[#229ED9] hover:bg-[#168dcc] text-white text-sm font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {pending === 'telegram' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>{t('telegram')}</span>
              </button>
            )}
            {providers === null && <Loader2 className="h-5 w-5 animate-spin text-[#0F4C5C] mx-auto" />}
            {providers?.size === 0 && (
              <p className="text-xs font-medium text-zinc-700 bg-[#F5EFE0] border border-zinc-900/10 rounded-xl px-3.5 py-3">
                {t('unavailable')}
              </p>
            )}
          </div>

          {hasError && (
            <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              {t('failed')}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-zinc-500">{t('privacy')}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
