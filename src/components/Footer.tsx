import Link from 'next/link';
import { useTranslations } from 'next-intl';
import RahnamoLogo from '@/components/RahnamoLogo';
import { Shield, Sparkles, Send, Mail, Heart } from 'lucide-react';

export default function Footer() {
  const t = useTranslations('common');
  const tFooter = useTranslations('footer');
  const specialtiesList = tFooter.raw('specialtiesList') as string[];

  return (
    <footer className="bg-gradient-to-b from-[#2C241E] to-[#1E1813] text-amber-100/80 pt-14 pb-8 border-t-4 border-amber-800">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Col 1: Brand Info */}
        <div className="md:col-span-1 space-y-3">
          <RahnamoLogo className="h-12" light={true} />
          <p className="text-xs text-amber-200/70 leading-relaxed">
            {tFooter('tagline')}
          </p>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold pt-1">
            <Shield className="w-3.5 h-3.5" /> {tFooter('verifiedBadge')}
          </div>
        </div>

        {/* Col 2: Navigation */}
        <div className="space-y-2 text-xs">
          <h4 className="font-serif font-bold text-amber-300 uppercase tracking-wider text-[11px]">{tFooter('platformHeading')}</h4>
          <ul className="space-y-2 pt-1 text-amber-100/70">
            <li>
              <Link href="/" className="hover:text-amber-300 transition-colors">
                {t('catalog')}
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className="hover:text-amber-300 transition-colors">
                {t('howItWorks')}
              </Link>
            </li>
            <li>
              <Link href="/my-bookings" className="hover:text-amber-300 transition-colors">
                {t('myBookings')}
              </Link>
            </li>
            <li>
              <Link href="/become-counselor" className="hover:text-amber-300 transition-colors">
                {t('becomeCounselorJoin')}
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-amber-300 transition-colors text-amber-400 font-semibold">
                {tFooter('adminPanel')}
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Specialties */}
        <div className="space-y-2 text-xs">
          <h4 className="font-serif font-bold text-amber-300 uppercase tracking-wider text-[11px]">{tFooter('specialtiesHeading')}</h4>
          <ul className="space-y-2 pt-1 text-amber-100/70">
            {specialtiesList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Col 4: Contact & Social */}
        <div className="space-y-3 text-xs">
          <h4 className="font-serif font-bold text-amber-300 uppercase tracking-wider text-[11px]">{tFooter('contactHeading')}</h4>
          <p className="text-amber-200/70 text-[11px]">
            {tFooter('contactBlurb')}
          </p>
          <a
            href="https://t.me/rahnamo_admin"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-amber-900/80 hover:bg-amber-800 text-amber-50 px-4 py-2.5 rounded-xl border border-amber-700/60 font-semibold transition-all shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" /> {tFooter('telegramSupport')}
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-amber-900/40 text-center text-[11px] text-amber-200/50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>{tFooter('copyright', { year: new Date().getFullYear() })}</p>
        <p className="flex items-center gap-1">
          {tFooter('madeWithPrefix')} <Heart className="w-3 h-3 text-amber-500 fill-amber-500" /> {tFooter('madeWithSuffix')}
        </p>
      </div>
    </footer>
  );
}