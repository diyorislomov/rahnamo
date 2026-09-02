'use client';

// TODO: Hero background is a static image; swap for a short looping video
// clip (6-10s, muted, autoplay) when available — see prior Seedance/
// Higgsfield prompt in project notes.

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Anton } from 'next/font/google';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown, VolumeX } from 'lucide-react';

const anton = Anton({ subsets: ['latin', 'latin-ext'], weight: '400', display: 'swap' });

// Static SVG-noise data URI: masks the softness of the (currently ~736px)
// source photography when it's stretched full-bleed, at zero network cost.
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

/**
 * Visual-only for now: no <audio> element exists yet, so the button is
 * disabled rather than pretending to control sound that isn't there. Swap in
 * a real <audio> + enable this once there's a licensed ambient track.
 */
function SoundToggle() {
  return (
    <button
      type="button"
      disabled
      aria-label="Ovoz (tez orada)"
      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/10 border border-white/20 backdrop-blur-xs text-amber-100/50 cursor-not-allowed"
    >
      <VolumeX className="w-3.5 h-3.5" />
    </button>
  );
}

export default function CinematicHero() {
  const shouldReduceMotion = useReducedMotion();
  const headerHeight = useHeaderHeight();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  // Slow continuous zoom + drift while the hero is in view — one cinematic
  // camera move rather than the old cross-fade between separate scenes.
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '8%']);

  return (
    <div style={headerHeight ? { marginTop: -headerHeight } : undefined}>
      <section ref={sectionRef} className="relative h-dvh w-full overflow-hidden bg-[#0d0a06]">
        <motion.div
          className="absolute inset-0"
          style={{
            scale: shouldReduceMotion ? 1 : scale,
            y: shouldReduceMotion ? '0%' : y,
          }}
        >
          <Image
            src="/desert-solar-ring-eclipse.jpg"
            alt="Sahroda quyosh halqasi tutilishi, karvon"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/35 via-amber-950/45 to-black/70" />
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{ backgroundImage: `url("${GRAIN_URL}")` }}
        />

        <div className="absolute top-6 right-6 sm:right-10 lg:right-16 z-30">
          <SoundToggle />
        </div>

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

              <h1
                className={`${anton.className} uppercase text-5xl sm:text-7xl lg:text-8xl text-amber-50 leading-[0.9] tracking-tight max-w-5xl`}
              >
                Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
              </h1>
            </motion.div>
          </div>
        </div>

        {!shouldReduceMotion && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-amber-100/70">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Pastga aylantiring</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        )}
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
