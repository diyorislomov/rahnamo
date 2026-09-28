'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { KeyRound, Lock, Loader2 } from 'lucide-react';

// The invite link from /api/admin/approve-application lands here with the
// session tokens in the URL hash. supabase-js's default `detectSessionInUrl`
// picks those up and fires SIGNED_IN automatically -- this page just waits
// for that before showing the form, rather than assuming a session exists
// the instant the page mounts.
export default function SetMentorPasswordPage() {
  const t = useTranslations('mentorAuth');
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setCheckingSession(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setHasSession(true);
        setCheckingSession(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      console.error('[SET_MENTOR_PASSWORD_FAILED]', updateError);
      setError(t('submitFailed'));
      return;
    }

    router.push('/mentor/dashboard');
  };

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
              {t('setPassword.badge')}
            </span>
            <h1 className="font-serif font-extrabold text-2xl text-amber-950 mt-3">{t('setPassword.title')}</h1>
            <p className="text-xs text-stone-600 mt-1">{t('setPassword.subtitle')}</p>
          </div>

          {checkingSession ? (
            <div className="flex items-center justify-center gap-2 text-xs text-stone-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('setPassword.checkingLink')}</span>
            </div>
          ) : !hasSession ? (
            <p className="text-xs text-red-600 font-semibold">{t('setPassword.invalidLink')}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {t('setPassword.passwordLabel')}
                </label>
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
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {t('setPassword.confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                <span>{t('setPassword.submit')}</span>
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
