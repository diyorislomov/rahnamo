'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Menu, X } from 'lucide-react';
import RahnamoLogo from './RahnamoLogo';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const t = useTranslations('discovery.nav');
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const links = [{ href: '/', label: t('mentors') }, { href: '/my-bookings', label: t('bookings') }, { href: '/forum', label: t('forum') }];
  const active = (href: string) => href === '/' ? pathname === '/' || pathname.startsWith('/counselors/') : pathname.startsWith(href);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { setIsOpen(false); toggleRef.current?.focus(); }
    }
    function onPointer(event: PointerEvent) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
  }, [isOpen]);

  return (
    <>
      <a href="#main-content" className="ui-skip-link">{t('skip')}</a>
      <header ref={headerRef} className="sticky top-0 z-40 border-b border-[#e7ddd0] bg-[#faf6ee]/95 backdrop-blur-sm">
        <div className="ui-container flex min-h-[76px] items-center justify-between gap-4">
          <Link href="/" aria-label="Rahnamo" onClick={() => setIsOpen(false)}><RahnamoLogo /></Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label={t('label')}>
            {links.map((link) => <Link key={link.href} href={link.href} className="ui-nav-link" aria-current={active(link.href) ? 'page' : undefined}>{link.label}</Link>)}
            <Link href="/become-counselor" className="ui-nav-link" aria-current={pathname === '/become-counselor' ? 'page' : undefined}>{t('become')}</Link>
            <span className="ml-3 border-l border-[#dfd2c1] pl-4"><LanguageSwitcher /></span>
          </nav>
          <button ref={toggleRef} type="button" onClick={() => setIsOpen(!isOpen)} aria-label={t(isOpen ? 'close' : 'open')}
            aria-expanded={isOpen} aria-controls="mobile-navigation" className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#dfd2c1] lg:hidden">
            {isOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
        {isOpen && <nav id="mobile-navigation" aria-label={t('label')} className="ui-container max-h-[calc(100dvh-76px)] overflow-y-auto border-t border-[#e7ddd0] pb-5 pt-3 lg:hidden">
          <div className="grid gap-1">{links.map((link) => <Link key={link.href} href={link.href} className="ui-nav-link" aria-current={active(link.href) ? 'page' : undefined} onClick={() => setIsOpen(false)}>{link.label}</Link>)}
            <Link href="/become-counselor" className="ui-nav-link" aria-current={pathname === '/become-counselor' ? 'page' : undefined} onClick={() => setIsOpen(false)}>{t('become')}</Link>
          </div><div className="mt-3 border-t border-[#e7ddd0] pt-3"><LanguageSwitcher /></div>
        </nav>}
      </header>
      <div id="main-content" tabIndex={-1} className="ui-main-anchor" />
    </>
  );
}
