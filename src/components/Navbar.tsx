'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RahnamoLogo from '@/components/RahnamoLogo';
import { Menu, X, CalendarCheck, UserCheck, Compass, Sparkles } from 'lucide-react';

/**
 * Opt-in only: every route but the homepage renders bare <Navbar /> and is
 * completely unaffected. When true, the header starts transparent (over the
 * cinematic hero) and switches to solid once `[data-hero-end]` — a sentinel
 * CinematicHero renders after its last section — scrolls above the viewport.
 * A one-time boolean flip at a real boundary, not a continuous scroll
 * listener.
 */
function useSolidPastHero(enabled: boolean) {
  const [isSolid, setIsSolid] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;
    const sentinel = document.querySelector('[data-hero-end]');
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsSolid(entry.boundingClientRect.top <= 0),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled]);

  return isSolid;
}

export default function Navbar({ transparentOverHero = false }: { transparentOverHero?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const isSolid = useSolidPastHero(transparentOverHero);
  const transparent = transparentOverHero && !isSolid;

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-500 ${
        transparent
          ? 'bg-transparent border-transparent'
          : 'bg-[#FAF6EE]/90 backdrop-blur-md border-amber-900/15'
      }`}
    >
      {/* Top Banner Notice — opacity-only fade so the header's height (and
          the sticky position of everything below it) never jumps at the
          transparent/solid boundary. */}
      <div
        className={`bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-amber-100 text-[11px] font-medium py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-inner transition-opacity duration-500 ${
          transparent ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
        <span>Buyuk Ipak Yo'li karyera konsultatsiyasi va 1-ga-1 mentorlik platformasi</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Official Startup Brand Logo */}
        <Link href="/" className="group py-1 flex items-center">
          <RahnamoLogo className="h-11 sm:h-12" light={transparent} />
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className={`hidden md:flex items-center gap-6 text-xs font-bold transition-colors duration-500 ${
            transparent ? 'text-amber-50/90' : 'text-stone-700'
          }`}
        >
          <Link
            href="/"
            className={`transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg ${
              transparent ? 'hover:text-amber-50 hover:bg-white/10' : 'hover:text-amber-900 hover:bg-amber-100/60'
            }`}
          >
            <Compass className={`w-4 h-4 ${transparent ? 'text-amber-200' : 'text-amber-800'}`} /> Rahnamolar
            Katalogi
          </Link>
          <Link
            href="/#how-it-works"
            className={`transition-colors py-1 px-2.5 rounded-lg ${
              transparent ? 'hover:text-amber-50 hover:bg-white/10' : 'hover:text-amber-900 hover:bg-amber-100/60'
            }`}
          >
            Qanday ishlaydi?
          </Link>
          <Link
            href="/my-bookings"
            className={`flex items-center gap-1.5 transition-all py-1 px-2.5 rounded-lg ${
              transparent
                ? 'hover:text-amber-50 hover:bg-white/10'
                : 'bg-amber-100/80 hover:bg-amber-200/80 text-amber-950 px-3.5 py-2 rounded-xl border border-amber-300/80 shadow-2xs'
            }`}
          >
            <CalendarCheck className={`w-4 h-4 ${transparent ? 'text-amber-200' : 'text-amber-800'}`} />
            Mening qabullarim
          </Link>
          <Link
            href="/become-counselor"
            className={`flex items-center gap-1.5 transition-all py-1 px-2.5 rounded-lg ${
              transparent
                ? 'hover:text-amber-50 hover:bg-white/10'
                : 'bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 px-4 py-2 rounded-xl shadow-sm border border-amber-700/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Rahnamo bo'lish
          </Link>
        </nav>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`md:hidden p-2 focus:outline-none rounded-xl transition-colors ${
            transparent ? 'text-amber-50 hover:text-amber-100' : 'text-amber-950 hover:text-amber-700 bg-amber-100/60'
          }`}
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer — always solid regardless of header state */}
      {isOpen && (
        <div className="md:hidden bg-[#FAF6EE] border-b border-amber-900/20 px-4 pt-2 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-semibold text-stone-800 px-3 py-2 hover:bg-amber-100/60 rounded-xl"
          >
            Rahnamolar katalogi
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-semibold text-stone-800 px-3 py-2 hover:bg-amber-100/60 rounded-xl"
          >
            Qanday ishlaydi?
          </Link>
          <Link
            href="/my-bookings"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-semibold text-amber-950 px-3 py-2.5 bg-amber-100/80 rounded-xl border border-amber-300/60"
          >
            Mening qabullarim
          </Link>
          <Link
            href="/become-counselor"
            onClick={() => setIsOpen(false)}
            className="block text-center text-xs font-bold text-amber-50 bg-amber-900 px-4 py-3 rounded-xl shadow-xs"
          >
            Rahnamo bo'lib qo'shilish
          </Link>
        </div>
      )}
    </header>
  );
}
