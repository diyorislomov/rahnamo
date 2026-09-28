'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { KeyRound, Mail, Lock, Loader2 } from 'lucide-react';

function LoginForm() {
  const t = useTranslations('menteeAuth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/my-bookings';

  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // An anonymous session (from Text Q&A) doesn't count as "already logged
    // in" here -- only a real mentee session should skip the login form.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user && !data.session.user.is_anonymous) {
        router.replace(redirectTo);
        return;
      }
      setCheckingSession(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);

    if (signInError) {
      console.error('[MENTEE_LOGIN_FAILED]', signInError);
      setError(signInError.code === 'email_not_confirmed' ? t('login.emailNotConfirmed') : t('login.failed'));
      return;
    }

    router.push(redirectTo);
  };

  if (checkingSession) {
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
              {t('login.badge')}
            </span>
            <h1 className="font-serif font-extrabold text-2xl text-amber-950 mt-3">{t('login.title')}</h1>
            <p className="text-xs text-stone-600 mt-1">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">{t('login.emailLabel')}</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">{t('login.passwordLabel')}</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                />
              </div>
              {error && <p className="text-[11px] text-red-600 font-semibold mt-1.5">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin text-amber-300" /> : <Lock className="w-4 h-4 text-amber-300" />}
              <span>{t('login.submit')}</span>
            </button>
          </form>

          <p className="text-xs text-stone-500">
            {t('login.noAccount')}{' '}
            <Link href="/signup" className="font-bold text-amber-900 hover:text-amber-700">
              {t('login.signupLink')}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function MenteeLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF6EE]" />}>
      <LoginForm />
    </Suspense>
  );
}
