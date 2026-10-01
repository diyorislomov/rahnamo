'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ResetPasswordPage() {
  const t = useTranslations('menteeAuth.reset');
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8 || password !== confirmation) {
      setError(password.length < 8 ? t('tooShort') : t('mismatch'));
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      console.error('[PASSWORD_RESET_FAILED]', updateError);
      setError(t('failed'));
      return;
    }
    setComplete(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] flex flex-col justify-between">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-16 w-full">
        <div className="bg-white rounded-3xl border border-amber-900/15 p-8 shadow-xl space-y-5">
          <h1 className="font-serif font-extrabold text-2xl text-amber-950">{t('title')}</h1>
          {complete ? (
            <><p className="text-xs text-emerald-700 font-semibold">{t('success')}</p><Link href="/login" className="text-xs font-bold text-amber-900">{t('login')}</Link></>
          ) : !ready ? (
            <p className="text-xs text-stone-600">{t('invalidLink')}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {[{ value: password, setter: setPassword, placeholder: t('password') }, { value: confirmation, setter: setConfirmation, placeholder: t('confirmation') }].map((field) => (
                <div key={field.placeholder} className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input type="password" required minLength={8} maxLength={200} autoComplete="new-password" value={field.value} onChange={(event) => field.setter(event.target.value)} placeholder={field.placeholder} className="w-full pl-10 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700" />
                </div>
              ))}
              {error && <p className="text-[11px] text-red-600 font-semibold">{error}</p>}
              <button disabled={submitting} className="w-full py-3.5 bg-amber-900 text-amber-50 font-bold text-xs rounded-2xl disabled:opacity-60 flex justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{t('submit')}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
