'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { KeyRound, Mail, User, UserPlus, Loader2, MailCheck } from 'lucide-react';
import { safeRedirectPath } from '@/lib/safeRedirect';

function SignupForm() {
  const t = useTranslations('menteeAuth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get('redirect'), '/my-bookings');

  const [checkingSession, setCheckingSession] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkEmailFor, setCheckEmailFor] = useState('');

  useEffect(() => {
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

    if (password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'mentee', full_name: fullName } },
    });
    setSubmitting(false);

    if (signUpError) {
      console.error('[MENTEE_SIGNUP_FAILED]', signUpError);
      if (signUpError.message.toLowerCase().includes('already')) {
        setError(t('signup.emailAlreadyRegistered'));
      } else {
        setError(t('submitFailed'));
      }
      return;
    }

    if (data.session) {
      router.push(redirectTo);
      return;
    }

    // No session back means the project requires email confirmation before
    // a session is issued -- not an error, just a different next step.
    setCheckEmailFor(email);
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
            {checkEmailFor ? <MailCheck className="w-8 h-8 text-amber-300" /> : <UserPlus className="w-8 h-8 text-amber-300" />}
          </div>

          {checkEmailFor ? (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                {t('signup.badge')}
              </span>
              <p className="text-sm text-stone-700 mt-3">{t('signup.checkEmail', { email: checkEmailFor })}</p>
            </div>
          ) : (
            <>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  {t('signup.badge')}
                </span>
                <h1 className="font-serif font-extrabold text-2xl text-amber-950 mt-3">{t('signup.title')}</h1>
                <p className="text-xs text-stone-600 mt-1">{t('signup.subtitle')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">{t('signup.fullNameLabel')}</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      maxLength={120}
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t('signup.fullNamePlaceholder')}
                      className="w-full pl-10 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">{t('signup.emailLabel')}</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      maxLength={254}
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">{t('signup.passwordLabel')}</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      maxLength={200}
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">{t('signup.confirmPasswordLabel')}</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      maxLength={200}
                      autoComplete="new-password"
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
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin text-amber-300" /> : <UserPlus className="w-4 h-4 text-amber-300" />}
                  <span>{t('signup.submit')}</span>
                </button>
              </form>

              <p className="text-xs text-stone-500">
                {t('signup.haveAccount')}{' '}
                <Link href="/login" className="font-bold text-amber-900 hover:text-amber-700">
                  {t('signup.loginLink')}
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function MenteeSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF6EE]" />}>
      <SignupForm />
    </Suspense>
  );
}
