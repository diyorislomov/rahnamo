import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import RahnamoLogo from './RahnamoLogo';

export default function Footer() {
  const t = useTranslations('discovery');
  return (
    <footer className="border-t border-[#e7ddd0] bg-[#efe5d5] py-10 sm:py-12">
      <div className="ui-container grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_.8fr_1fr]">
        <div><Link href="/" aria-label="Rahnamo"><RahnamoLogo /></Link><p className="ui-muted mt-4 max-w-xs text-sm leading-relaxed">{t('footer.body')}</p></div>
        <nav aria-label={t('footer.explore')}><h2 className="mb-3 text-sm font-semibold">{t('footer.explore')}</h2><ul className="grid gap-1 text-sm text-[#655548]">
          {([{ href: '/', key: 'mentors' }, { href: '/my-bookings', key: 'bookings' }, { href: '/forum', key: 'forum' }, { href: '/become-counselor', key: 'become' }] as const).map((link) => <li key={link.href}><Link href={link.href} className="inline-flex min-h-10 items-center hover:underline underline-offset-4">{t(`nav.${link.key}`)}</Link></li>)}
        </ul></nav>
        <div><h2 className="text-sm font-semibold">{t('footer.help')}</h2><p className="ui-muted mt-3 max-w-xs text-sm">{t('footer.helpBody')}</p><a href="https://t.me/rahnamo_admin" target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#8b431b] hover:underline underline-offset-4">{t('footer.support')}<ArrowUpRight size={16} aria-hidden="true" /></a></div>
      </div>
      <div className="ui-container mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[#d9cbb6] pt-5 text-xs text-[#6d6259]">
        <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p><p>{t('footer.location')}</p><Link href="/admin" className="inline-flex min-h-10 items-center hover:underline">{t('footer.admin')}</Link>
      </div>
    </footer>
  );
}
