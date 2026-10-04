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
  const hasError = Boolean(searchParams.get('error'));

  useEffect(() => {
    if (status === 'authenticated') router.replace(redirectTo);
  }, [redirectTo, router, status]);

  async function start(provider: 'google' | 'telegram') {
    setPending(provider);
    await signIn(provider, { callbackUrl: redirectTo });
    setPending(null);
  }

  if (status === 'loading' || status === 'authenticated') {
    return <div className="min-h-screen bg-[#FAF6EE]" />;
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased flex flex-col justify-between">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-16 w-full">
        <div className="bg-white rounded-3xl border border-amber-900/15 p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8 text-amber-300" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
              {t('badge')}
            </span>
            <h1 className="font-serif font-extrabold text-2xl text-amber-950 mt-3">
              {mode === 'signup' ? t('signupTitle') : t('loginTitle')}
            </h1>
            <p className="text-xs text-stone-600 mt-1">
              {mode === 'signup' ? t('signupSubtitle') : t('loginSubtitle')}
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => start('google')}
              disabled={pending !== null}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-sm font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {pending === 'google' ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
              {t('google')}
            </button>
            <button
              type="button"
              onClick={() => start('telegram')}
              disabled={pending !== null}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-[#229ED9] hover:bg-[#168dcc] text-white text-sm font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {pending === 'telegram' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              {t('telegram')}
            </button>
          </div>

          {hasError && (
            <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {t('failed')}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-stone-500">{t('privacy')}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

