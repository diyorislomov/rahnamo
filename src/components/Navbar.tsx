'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { RahnamoMonogram } from '@/components/RahnamoLogo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { supabase } from '@/lib/supabase';
import {
  Menu,
  X,
  ArrowUpRight,
  CalendarCheck,
  LayoutDashboard,
  User,
  Compass,
  LogIn,
  LogOut,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('common');
  const tNav = useTranslations('navbar');

  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user?.id);
  const [hasMentorSession, setHasMentorSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasMentorSession(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event: unknown, sess: unknown) => {
      setHasMentorSession(!!sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (y / docHeight) * 100)));
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
    setIsOpen(false);
  };

  const labels = {
    mentors: locale === 'ru' ? 'Менторы' : locale === 'en' ? 'Mentors' : 'Rahnamolar',
    roadmaps: locale === 'ru' ? 'AI Маршруты' : locale === 'en' ? 'AI Roadmaps' : 'AI Yo‘nalishlar',
    aiAdvisor: locale === 'ru' ? 'AI Советник' : locale === 'en' ? 'AI Advisor' : 'AI Maslahatchi',
    opportunities:
      locale === 'ru' ? 'Возможности' : locale === 'en' ? 'Opportunities' : 'Imkoniyatlar',
    howItWorks: t('howItWorks'),
  };

  return (
    <>
      {/* Top Scroll Progress Indicator in Desert Amber -> Lapis Lazuli */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-[3px] z-[60] bg-transparent pointer-events-none"
      >
        <div
          className="h-full bg-gradient-to-r from-[#F59E0B] via-[#D97706] to-[#C25E38] transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Top Global Beta Version Announcement Strip */}
      <div className="w-full bg-[#0F1E36] text-[#FBF9F5] border-b border-[#F59E0B]/30 py-1.5 px-3 sm:px-6 relative z-[55] shadow-xs">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between text-[11px] sm:text-xs">
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 font-bold uppercase font-mono text-[#F59E0B] tracking-wider text-[10px] bg-white/[0.08] px-2 py-0.5 rounded-full border border-[#F59E0B]/30 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
              BETA VERSIYA
            </span>
            <span className="text-slate-300 font-medium truncate">
              {locale === 'ru'
                ? 'Платформа в режиме открытого бета-тестирования. Рахнамо объединяет амбициозных студентов Центральной Азии!'
                : locale === 'en'
                  ? 'Open Beta Version • Connecting Central Asian talent with world-class mentors.'
                  : 'MyRahnamo ochiq beta versiyada ishlamoqda. Markaziy Osiyo yoshlari uchun jahon darajasidagi ustozlik ekotizimi!'}
            </span>
          </div>

          <a
            href="https://t.me/rahnamo_admin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#F59E0B] hover:text-amber-300 font-semibold shrink-0 ml-3 text-[11px] hover:underline"
          >
            <span>{locale === 'ru' ? 'Fikr / Aloqa' : locale === 'en' ? 'Feedback' : 'Fikr bildirish'}</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      <header className="sticky top-0 z-50 w-full max-w-full px-3 sm:px-6 lg:px-8 pt-2.5 pb-1.5 overflow-x-clip">
        <div
          className={`max-w-[1360px] mx-auto rounded-2xl transition-all duration-300 px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0 ${
            scrolled
              ? 'bg-[#FBF9F5]/92 backdrop-blur-xl shadow-[0_12px_36px_-14px_rgba(15,30,54,0.12)] border border-[#0F1E36]/10'
              : 'bg-[#FBF9F5]/80 backdrop-blur-md border border-[#0F1E36]/[0.07]'
          }`}
        >
          {/* Left: Brand Logo ("MyRahnamo." with Amber Accent Dot) */}
          <Link href="/" className="shrink-0 flex items-center gap-2 sm:gap-2.5 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0F1E36] flex items-center justify-center shadow-xs border border-[#F59E0B]/30 group-hover:scale-[1.03] transition-transform shrink-0">
              <RahnamoMonogram className="w-6 h-6 sm:w-7 sm:h-7" light={true} />
            </div>
            <div className="flex items-baseline shrink-0">
              <span className="font-display font-extrabold text-base sm:text-xl tracking-[-0.03em] text-[#0F1E36]">
                MyRahnamo
              </span>
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#F59E0B] inline-block ml-0.5 shadow-[0_0_8px_rgba(245,158,11,0.65)]"
              />
            </div>
            <span className="hidden sm:inline-flex items-center text-[9px] font-mono font-extrabold uppercase tracking-wider text-[#92400E] bg-[#F59E0B]/20 border border-[#F59E0B]/40 px-1.5 py-0.5 rounded-md ml-1.5 shrink-0">
              BETA
            </span>
          </Link>

          {/* Center Navigation Links: Streamlined and fully responsive without horizontal crowding */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 text-xs font-bold text-[#475569] shrink-0">
            <Link
              href="/#rahnamolar"
              className="px-2 xl:px-3 py-1.5 rounded-full hover:text-[#0F1E36] hover:bg-[#0F1E36]/[0.05] transition-colors whitespace-nowrap"
            >
              {labels.mentors}
            </Link>
            <Link
              href="/#roadmaps"
              onClick={() => window.dispatchEvent(new CustomEvent('rahnamo:tab', { detail: 'roadmaps' }))}
              className="px-2 xl:px-3 py-1.5 rounded-full bg-[#F59E0B]/15 text-[#92400E] hover:bg-[#F59E0B]/25 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3 text-[#D97706] shrink-0" />
              <span>{labels.roadmaps}</span>
            </Link>
            <Link
              href="/#imkoniyatlar"
              onClick={() => window.dispatchEvent(new CustomEvent('rahnamo:tab', { detail: 'opportunities' }))}
              className="px-2 xl:px-3 py-1.5 rounded-full hover:text-[#0F1E36] hover:bg-[#0F1E36]/[0.05] transition-colors whitespace-nowrap"
            >
              {labels.opportunities}
            </Link>
            <Link
              href="/#how-it-works"
              className="hidden xl:inline-flex px-2 xl:px-3 py-1.5 rounded-full hover:text-[#0F1E36] hover:bg-[#0F1E36]/[0.05] transition-colors whitespace-nowrap"
            >
              {labels.howItWorks}
            </Link>
            <Link
              href="/match"
              className={`hidden xl:inline-flex px-2 xl:px-3 py-1.5 rounded-full transition-colors items-center gap-1 whitespace-nowrap ${
                pathname === '/match'
                  ? 'bg-[#F59E0B]/15 text-[#B45309]'
                  : 'hover:text-[#0F1E36] hover:bg-[#0F1E36]/[0.05]'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#D97706] shrink-0" />
              <span>{t('findMyMentor')}</span>
            </Link>
            <Link
              href="/forum"
              className={`px-2 xl:px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                pathname?.startsWith('/forum')
                  ? 'bg-[#0F1E36]/[0.08] text-[#0F1E36]'
                  : 'hover:text-[#0F1E36] hover:bg-[#0F1E36]/[0.05]'
              }`}
            >
              {t('forum')}
            </Link>
          </nav>

          {/* Right Actions: Language Switcher (UZ / RU / EN) + Bookings/Auth + High-Contrast CTA */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto pl-2.5 sm:pl-3.5 border-l border-[#0F1E36]/10">
            <LanguageSwitcher />

            <Link
              href="/my-bookings"
              title={t('myBookings')}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#475569] hover:text-[#0F1E36] px-2 py-1.5 rounded-full hover:bg-[#0F1E36]/[0.05] transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-[#D97706]" />
              <span className="hidden 2xl:inline">{t('myBookings')}</span>
            </Link>

            {hasMentorSession && (
              <Link
                href="/mentor/dashboard"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-[#0F4C5C] bg-[#0F4C5C]/10 hover:bg-[#0F4C5C]/20 border border-[#0F4C5C]/20 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#0F4C5C]" />
                <span>{locale === 'ru' ? 'Кабинет' : locale === 'en' ? 'Mentor' : 'Mentor Kabineti'}</span>
              </Link>
            )}

            {isSignedIn && (
              <Link
                href="/profile"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-[#475569] hover:text-[#0F1E36] px-2.5 py-1.5 rounded-full hover:bg-[#0F1E36]/[0.05] transition-colors whitespace-nowrap"
              >
                <User className="w-3.5 h-3.5 text-[#0F1E36]" />
                <span>{locale === 'ru' ? 'Профиль' : locale === 'en' ? 'Profile' : 'Profil'}</span>
              </Link>
            )}

            {isSignedIn ? (
              <button
                type="button"
                onClick={handleSignOut}
                title={t('signOut')}
                aria-label={t('signOut')}
                className="p-2 rounded-full text-[#0F1E36] hover:bg-[#0F1E36]/[0.06] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/login"
                title={t('signIn')}
                aria-label={t('signIn')}
                className="p-2 rounded-full text-[#0F1E36] hover:bg-[#0F1E36]/[0.06] transition-colors"
              >
                <LogIn className="w-4 h-4" />
              </Link>
            )}

            {/* Become a Rahnamo CTA: Visible across lg and up */}
            {pathname !== '/become-counselor' ? (
              <Link
                href="/become-counselor"
                className="hidden lg:inline-flex items-center gap-1.5 bg-[#0F1E36] hover:bg-[#1B3154] text-white font-bold text-xs px-3 xl:px-4 py-2 rounded-full border border-[#F59E0B]/35 shadow-xs transition-all whitespace-nowrap shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                <span>{t('becomeCounselor')}</span>
                <ArrowUpRight className="w-3 h-3 text-[#F59E0B]" />
              </Link>
            ) : (
              <Link
                href="/#rahnamolar"
                className="hidden lg:inline-flex items-center gap-1.5 bg-[#0F1E36]/[0.06] hover:bg-[#0F1E36]/[0.10] text-[#0F1E36] font-bold text-xs px-3 py-2 rounded-full transition-all whitespace-nowrap shrink-0"
              >
                <span>{labels.mentors}</span>
                <ArrowUpRight className="w-3 h-3 text-[#D97706]" />
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-xl text-[#0F1E36] hover:bg-[#0F1E36]/[0.06] transition-colors cursor-pointer"
              aria-label={tNav('toggleMenuAriaLabel')}
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Slide-Down Glass Drawer */}
        {isOpen && (
          <div className="lg:hidden mt-2 max-w-[1360px] mx-auto rounded-3xl bg-[#FBF9F5]/98 backdrop-blur-2xl border border-[#0F1E36]/10 shadow-2xl p-5 space-y-2">
            <Link
              href="/#rahnamolar"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between text-sm font-bold text-[#0F1E36] px-4 py-3 rounded-2xl bg-[#0F1E36]/[0.05]"
            >
              <span className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-[#D97706]" />
                <span>{labels.mentors}</span>
              </span>
              <span className="font-mono text-xs text-[#D97706]">01</span>
            </Link>
            <Link
              href="/#roadmaps"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between text-sm font-semibold text-[#475569] px-4 py-3 rounded-2xl hover:bg-[#0F1E36]/[0.04]"
            >
              <span>{labels.roadmaps}</span>
              <span className="font-mono text-xs text-[#64748B]">02</span>
            </Link>
            <Link
              href="/#ai-copilot"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between text-sm font-bold text-[#92400E] px-4 py-3 rounded-2xl bg-[#F59E0B]/15"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D97706]" />
                <span>{labels.aiAdvisor}</span>
              </span>
              <span className="font-mono text-xs text-[#D97706]">AI</span>
            </Link>
            <Link
              href="/#imkoniyatlar"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between text-sm font-semibold text-[#475569] px-4 py-3 rounded-2xl hover:bg-[#0F1E36]/[0.04]"
            >
              <span>{labels.opportunities}</span>
              <span className="font-mono text-xs text-[#64748B]">03</span>
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between text-sm font-semibold text-[#475569] px-4 py-3 rounded-2xl hover:bg-[#0F1E36]/[0.04]"
            >
              <span>{labels.howItWorks}</span>
              <span className="font-mono text-xs text-[#64748B]">04</span>
            </Link>
            <Link
              href="/match"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-sm font-semibold text-[#475569] px-4 py-3 rounded-2xl hover:bg-[#0F1E36]/[0.04]"
            >
              <Sparkles className="w-4 h-4 text-[#D97706]" />
              <span>{t('findMyMentor')}</span>
            </Link>
            <Link
              href="/forum"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-sm font-semibold text-[#475569] px-4 py-3 rounded-2xl hover:bg-[#0F1E36]/[0.04]"
            >
              <MessageSquare className="w-4 h-4 text-[#D97706]" />
              <span>{t('forum')}</span>
            </Link>
            <Link
              href="/my-bookings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-sm font-semibold text-[#475569] px-4 py-3 rounded-2xl hover:bg-[#0F1E36]/[0.04]"
            >
              <CalendarCheck className="w-4 h-4 text-[#D97706]" />
              <span>{t('myBookings')}</span>
            </Link>

            <div className="pt-3 border-t border-[#0F1E36]/10 flex flex-col gap-2.5">
              <Link
                href="/become-counselor"
                onClick={() => setIsOpen(false)}
                className="btn-yv-primary w-full justify-between"
              >
                <span>{t('becomeCounselorJoin')}</span>
                <span className="badge">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
