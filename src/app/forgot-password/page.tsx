'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ForgotPasswordPage() {
  const t = useTranslations('menteeAuth.forgot');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (resetError) {
      console.error('[PASSWORD_RESET_REQUEST_FAILED]', resetError);
      setError(t('failed'));
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] flex flex-col justify-between">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-16 w-full">
        <div className="bg-white rounded-3xl border border-amber-900/15 p-8 shadow-xl space-y-5">
          <h1 className="font-serif font-extrabold text-2xl text-amber-950">{t('title')}</h1>
          <p className="text-xs text-stone-600">{sent ? t('sent') : t('subtitle')}</p>
          {!sent && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full pl-10 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                />
              </div>
              {error && <p className="text-[11px] text-red-600 font-semibold">{error}</p>}
              <button disabled={submitting} className="w-full py-3.5 bg-amber-900 text-amber-50 font-bold text-xs rounded-2xl disabled:opacity-60 flex justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{t('submit')}
              </button>
            </form>
          )}
          <Link href="/login" className="text-xs font-bold text-amber-900 hover:text-amber-700">{t('back')}</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
