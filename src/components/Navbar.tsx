'use client';

import { useState } from 'react';
import Link from 'next/link';
import RahnamoLogo from '@/components/RahnamoLogo';
import { Menu, X, CalendarCheck, UserCheck, Compass, Sparkles } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#FAF6EE]/90 backdrop-blur-md border-b border-amber-900/15 transition-all">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-amber-100 text-[11px] font-medium py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-inner">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
        <span>Buyuk Ipak Yo'li karyera konsultatsiyasi va 1-ga-1 mentorlik platformasi</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Official Startup Brand Logo */}
        <Link href="/" className="group py-1">
          <RahnamoLogo className="h-9" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-stone-700">
          <Link
            href="/"
            className="hover:text-amber-900 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-amber-100/60"
          >
            <Compass className="w-4 h-4 text-amber-800" /> Rahnamolar Katalogi
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-amber-900 transition-colors py-1 px-2.5 rounded-lg hover:bg-amber-100/60"
          >
            Qanday ishlaydi?
          </Link>
          <Link
            href="/my-bookings"
            className="flex items-center gap-1.5 bg-amber-100/80 hover:bg-amber-200/80 text-amber-950 px-3.5 py-2 rounded-xl border border-amber-300/80 shadow-2xs transition-all"
          >
            <CalendarCheck className="w-4 h-4 text-amber-800" />
            Mening qabullarim
          </Link>
          <Link
            href="/become-counselor"
            className="bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 border border-amber-700/50"
          >
            <UserCheck className="w-4 h-4" />
            Rahnamo bo'lish
          </Link>
        </nav>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-amber-950 hover:text-amber-700 focus:outline-none rounded-xl bg-amber-100/60"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
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