'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll } from 'framer-motion';
import Starfield from './Starfield';
import HeroHorizon from './HeroHorizon';

// Static SVG-noise data URI: adds a touch of film grain over the flat
// illustrated sky, at zero network cost.
const GRAIN_URL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>";

/**
 * <header> is `position: sticky`, which still reserves its own space in
 * normal flow — making it transparent only reveals the page's own
 * background behind it, not this hero, since the hero starts as a separate
 * sibling below that reserved space rather than underneath it. Pulling the
 * whole hero up by the header's real height corrects that, letting it
 * extend to the true top of the viewport with the header floating over it.
 * Measured rather than hardcoded since the header's height varies (mobile
 * nav, and the top banner text can wrap on narrow viewports).
 */
function useHeaderHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const observer = new ResizeObserver((entries) => setHeight(entries[0].contentRect.height));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return height;
}

export default function CinematicHero() {
  const shouldReduceMotion = useReducedMotion();
  const headerHeight = useHeaderHeight();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  return (
    <div style={headerHeight ? { marginTop: -headerHeight } : undefined}>
      <section ref={sectionRef} className="relative h-dvh w-full overflow-hidden bg-[#0d0a06]">
        <Starfield />
        <HeroHorizon scrollYProgress={scrollYProgress} shouldReduceMotion={shouldReduceMotion} />

        {/* Darkens the sky for text legibility, then eases off well before the
            horizon band. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, rgba(69,26,3,0.35) 0%, rgba(69,26,3,0.5) 45%, rgba(20,13,6,0.4) 60%, rgba(20,13,6,0.1) 100%)',
          }}
        />
        {/* Shared grain across the whole hero. */}
        <div
          className="absolute inset-0 opacity-[0.1] mix-blend-overlay"
          style={{ backgroundImage: `url("${GRAIN_URL}")` }}
        />

        <div className="relative z-10 h-full w-full flex items-center">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 w-full flex flex-col items-center text-center">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/70">
                Ipak yo&apos;li karyera platformasi
              </p>

              <h1 className="font-serif font-extrabold text-4xl sm:text-6xl lg:text-7xl text-amber-50 leading-[1.1] tracking-tight max-w-4xl">
                Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
              </h1>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Short breath into the catalog — a plain gradient, no image or text.
          Keeps the hero from cutting hard into the cream catalog below. */}
      <div className="h-[30vh] sm:h-[40vh] w-full bg-gradient-to-b from-[#0d0a06] to-[#FAF6EE]" />

      {/* Marks the true end of the hero, watched by Navbar (transparentOverHero)
          to know when to switch to its solid state — placed at the end of the
          transition strip, not the hero section, so the navbar solidifies
          right as the background actually turns cream. */}
      <div data-hero-end aria-hidden className="h-px w-full" />
    </div>
  );
}
