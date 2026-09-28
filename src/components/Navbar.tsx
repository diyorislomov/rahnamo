'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import RahnamoLogo from '@/components/RahnamoLogo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { supabase } from '@/lib/supabase';
import { Menu, X, CalendarCheck, UserCheck, Compass, Sparkles, LogIn, LogOut } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('common');
  const tNav = useTranslations('navbar');

  // null = not signed in (or an anonymous Text Q&A session, which doesn't
  // count as a real mentee account here) -- this is the only place across
  // the whole site a mentee sees a sign-in/sign-out entry point, so it has
  // to reflect the real, current session on every page.
  const [menteeEmail, setMenteeEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      setMenteeEmail(user && !user.is_anonymous ? user.email || null : null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !session.user.is_anonymous) {
        setMenteeEmail(session.user.email || null);
      }
      if (event === 'SIGNED_OUT') {
        setMenteeEmail(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-[#FAF6EE]/90 backdrop-blur-md border-amber-900/15">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-amber-100 text-[11px] font-medium py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-inner">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
        <span>{tNav('banner')}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Official Startup Brand Logo */}
        <Link href="/" className="group py-1 flex items-center">
          <RahnamoLogo className="h-11 sm:h-12" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-stone-700">
          <Link
            href="/"
            className="transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:text-amber-900 hover:bg-amber-100/60"
          >
            <Compass className="w-4 h-4 text-amber-800" /> {t('catalog')}
          </Link>
          <Link
            href="/#how-it-works"
            className="transition-colors py-1 px-2.5 rounded-lg hover:text-amber-900 hover:bg-amber-100/60"
          >
            {t('howItWorks')}
          </Link>
          <Link href="/forum" className="transition-colors py-1 px-2.5 rounded-lg hover:text-amber-900 hover:bg-amber-100/60">
            {t('forum')}
          </Link>
          <Link
            href="/my-bookings"
            className="flex items-center gap-1.5 transition-all bg-amber-100/80 hover:bg-amber-200/80 text-amber-950 px-3.5 py-2 rounded-xl border border-amber-300/80 shadow-2xs"
          >
            <CalendarCheck className="w-4 h-4 text-amber-800" />
            {t('myBookings')}
          </Link>
          <Link
            href="/become-counselor"
            className="flex items-center gap-1.5 transition-all bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 px-4 py-2 rounded-xl shadow-sm border border-amber-700/50"
          >
            <UserCheck className="w-4 h-4" />
            {t('becomeCounselor')}
          </Link>
          {menteeEmail ? (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 transition-colors py-1 px-2.5 rounded-lg hover:text-amber-900 hover:bg-amber-100/60 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-amber-800" /> {t('signOut')}
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 transition-colors py-1 px-2.5 rounded-lg hover:text-amber-900 hover:bg-amber-100/60"
            >
              <LogIn className="w-4 h-4 text-amber-800" /> {t('signIn')}
            </Link>
          )}
          <LanguageSwitcher />
        </nav>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 focus:outline-none rounded-xl transition-colors text-amber-950 hover:text-amber-700 bg-amber-100/60"
          aria-label={tNav('toggleMenuAriaLabel')}
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
            {t('catalog')}
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-semibold text-stone-800 px-3 py-2 hover:bg-amber-100/60 rounded-xl"
          >
            {t('howItWorks')}
          </Link>
          <Link
            href="/forum"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-semibold text-stone-800 px-3 py-2 hover:bg-amber-100/60 rounded-xl"
          >
            {t('forum')}
          </Link>
          <Link
            href="/my-bookings"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-semibold text-amber-950 px-3 py-2.5 bg-amber-100/80 rounded-xl border border-amber-300/60"
          >
            {t('myBookings')}
          </Link>
          <Link
            href="/become-counselor"
            onClick={() => setIsOpen(false)}
            className="block text-center text-xs font-bold text-amber-50 bg-amber-900 px-4 py-3 rounded-xl shadow-xs"
          >
            {t('becomeCounselorJoin')}
          </Link>
          {menteeEmail ? (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 text-sm font-semibold text-stone-800 px-3 py-2 hover:bg-amber-100/60 rounded-xl cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-amber-800" /> {t('signOut')}
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-sm font-semibold text-stone-800 px-3 py-2 hover:bg-amber-100/60 rounded-xl"
            >
              <LogIn className="w-4 h-4 text-amber-800" /> {t('signIn')}
            </Link>
          )}
          <div className="pt-1">
            <LanguageSwitcher className="w-full justify-center" />
          </div>
        </div>
      )}
    </header>
  );
}
