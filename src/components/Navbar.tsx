'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CamelIcon, GuidingStarIcon } from '@/components/Icons';
import { Menu, X, CalendarCheck, HelpCircle, UserCheck } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-amber-900/10 bg-[#FAF6EE]/95 backdrop-blur-md px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-700 via-orange-800 to-amber-950 flex items-center justify-center text-amber-100 shadow-md shadow-amber-900/20">
            <CamelIcon className="w-5 h-5 fill-amber-100" />
          </div>
          <div>
            <span className="font-serif font-black text-2xl tracking-wide text-amber-950 flex items-center gap-1.5">
              rahnamo
            </span>
            <span className="block text-[10px] tracking-widest uppercase font-semibold text-amber-800/70 -mt-1">
              Silk Road Career Mentors
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-stone-700">
          <Link href="/" className="hover:text-amber-900 transition-colors">
            Rahnamolar
          </Link>
          <Link href="/#how-it-works" className="hover:text-amber-900 transition-colors flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-800" />
            Qanday ishlaydi?
          </Link>
          <Link
            href="/my-bookings"
            className="hover:text-amber-900 transition-colors flex items-center gap-1.5 bg-amber-100/80 text-amber-950 px-3.5 py-1.5 rounded-full border border-amber-300/60"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-amber-800" />
            Mening qabullarim
          </Link>
          <Link
            href="/become-counselor"
            className="bg-amber-900 hover:bg-amber-800 text-amber-50 px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Rahnamo bo'lish
          </Link>
        </nav>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-stone-700 hover:text-amber-900 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden pt-4 pb-3 border-t border-amber-900/10 mt-3 space-y-3">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-semibold text-stone-800 px-3 py-2 hover:bg-amber-100/50 rounded-lg"
          >
            Rahnamolar katalogi
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-semibold text-stone-800 px-3 py-2 hover:bg-amber-100/50 rounded-lg"
          >
            Qanday ishlaydi?
          </Link>
          <Link
            href="/my-bookings"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-semibold text-amber-950 px-3 py-2 bg-amber-100/80 rounded-lg border border-amber-300/60"
          >
            Mening qabullarim
          </Link>
          <Link
            href="/become-counselor"
            onClick={() => setIsOpen(false)}
            className="block text-center text-xs font-bold text-amber-50 bg-amber-900 px-4 py-2.5 rounded-xl"
          >
            Rahnamo bo'lib qo'shilish
          </Link>
        </div>
      )}
    </header>
  );
}