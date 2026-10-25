'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { RahnamoMonogram } from '@/components/RahnamoLogo';
import { ArrowUpRight, Heart, ShieldCheck, Send } from 'lucide-react';

export default function Footer() {
  const tCommon = useTranslations('common');
  const tFooter = useTranslations('footer');
  const specialties = tFooter.raw('specialtiesList') as string[];

  return (
    <footer className="mt-16 bg-[#0F1E36] text-slate-300 border-t-2 border-[#F59E0B]/40 relative overflow-hidden neo-silk-tessellation-dark">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Col 1: MyRahnamo Brand Identity & Neo-Silk Road Tagline */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-[#F59E0B]/40">
                <RahnamoMonogram className="w-7 h-7" light={true} />
              </div>
              <div className="flex items-baseline">
                <span className="font-display font-extrabold text-xl tracking-[-0.03em] text-white">
                  MyRahnamo
                </span>
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full bg-[#F59E0B] inline-block ml-0.5 shadow-[0_0_8px_rgba(245,158,11,0.75)]"
                />
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed max-w-sm">
              {tFooter('tagline')}
            </p>

            <div className="inline-flex items-center gap-2 text-xs text-amber-200 bg-white/[0.06] px-3.5 py-1.5 rounded-full border border-[#F59E0B]/30 font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span>{tFooter('verifiedBadge')}</span>
            </div>
          </div>

          {/* Col 2: Platform & Institutional Links */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-[0.16em] text-[#F59E0B]">
              {tFooter('platformHeading')}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
              <li>
                <Link href="/mentors" className="hover:text-white transition-colors">
                  {tCommon('catalog')}
                </Link>
              </li>
              <li>
                <Link href="/resources#roadmaps" className="hover:text-white transition-colors">
                  Yo‘nalishlar (Roadmaps)
                </Link>
              </li>
              <li>
                <Link href="/resources#ecosystem" className="hover:text-white transition-colors">
                  Imkoniyatlar (Ecosystem)
                </Link>
              </li>
              <li>
                <Link href="/match" className="hover:text-white transition-colors">
                  {tCommon('findMyMentor')}
                </Link>
              </li>
              <li>
                <Link href="/forum" className="hover:text-white transition-colors">
                  {tCommon('forum')}
                </Link>
              </li>
              <li>
                <Link href="/my-bookings" className="hover:text-white transition-colors">
                  {tCommon('myBookings')}
                </Link>
              </li>
              <li>
                <Link href="/become-counselor" className="hover:text-white transition-colors">
                  {tCommon('becomeCounselorJoin')}
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="text-[#F59E0B] hover:text-amber-300 font-semibold transition-colors"
                >
                  {tFooter('adminPanel')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Career & Academic Tracks */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-[0.16em] text-[#F59E0B]">
              {tFooter('specialtiesHeading')}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
              {specialties.map((item, idx) => (
                <li key={idx} className="leading-snug">
                  <Link href="/mentors" className="hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact & Official Telegram Support (@rahnamo_admin) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-[0.16em] text-[#F59E0B]">
              {tFooter('contactHeading')}
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {tFooter('contactBlurb')}
            </p>
            <a
              href="https://t.me/rahnamo_admin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#0F1E36] bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:brightness-105 px-5 py-3 rounded-full transition-all shadow-md"
            >
              <Send className="w-3.5 h-3.5 text-[#0F1E36]" />
              <span>{tFooter('telegramSupport')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>{tFooter('copyright', { year: 2026 })}</p>
          <p className="flex items-center gap-1.5">
            <span>{tFooter('madeWithPrefix')}</span>
            <Heart className="w-3.5 h-3.5 text-[#C25E38] fill-[#C25E38]" />
            <span>{tFooter('madeWithSuffix')}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
