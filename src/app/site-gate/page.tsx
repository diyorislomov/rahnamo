'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import RahnamoLogo from '@/components/RahnamoLogo';
import { Lock, KeyRound } from 'lucide-react';

// Deliberately standalone -- no Navbar/Footer. Showing site navigation on
// a "this site isn't open yet" screen would let a visitor click straight
// past the gate into pages that are themselves still gated, same
// reasoning as the standalone /survey page.
function SiteGateForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/site/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!data.success) {
        setIsSubmitting(false);
        setError("Parol noto'g'ri. Qaytadan urinib ko'ring.");
        return;
      }

      // A full navigation, not a client-side route change -- the next
      // request must actually pass back through the proxy with the
      // freshly-set cookie attached, to prove the gate really opens.
      window.location.href = next;
    } catch {
      setIsSubmitting(false);
      setError("Tekshirishda xatolik yuz berdi. Qayta urinib ko'ring.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] flex flex-col items-center justify-center px-4 py-16">
      <RahnamoLogo className="h-11 mb-8" />

      <div className="w-full max-w-md bg-white rounded-3xl border border-amber-900/15 p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8 text-amber-300" />
        </div>

        <div>
          <h1 className="font-serif font-extrabold text-2xl text-amber-950 mt-1">
            Sayt hali ishga tushmagan
          </h1>
          <p className="text-xs text-stone-600 mt-1">Davom etish uchun parolni kiriting.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">Parol</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
              />
            </div>
            {error && <p className="text-[11px] text-red-600 font-semibold mt-1.5">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <Lock className="w-4 h-4 text-amber-300" />
            <span>{isSubmitting ? 'Tekshirilmoqda...' : 'Kirish'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SiteGatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF6EE]" />}>
      <SiteGateForm />
    </Suspense>
  );
}
