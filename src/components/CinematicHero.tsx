'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Anton } from 'next/font/google';
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { ChevronDown, Star, VolumeX } from 'lucide-react';

const anton = Anton({ subsets: ['latin', 'latin-ext'], weight: '400', display: 'swap' });

const SECTION_COUNT = 4;

// Static SVG-noise data URI: masks the softness of the (currently ~736px)
// source photography when it's stretched full-bleed, at zero network cost.
const GRAIN_URL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>";

const SectionProgressContext = createContext<MotionValue<number> | null>(null);

function useSectionProgress() {
  const ctx = useContext(SectionProgressContext);
  if (!ctx) throw new Error('Must be used inside a CinematicSection');
  return ctx;
}

/**
 * Continuously scroll-scrubbed reveal — opacity/y are `useTransform` outputs
 * of the section's own scroll progress, not a triggered-once animation. This
 * is what makes the hero read as one continuous take instead of a slideshow:
 * scrolling back up reverses the fade exactly as it happened going down.
 */
function ScrollReveal({
  children,
  className,
  range = [0, 0.3],
}: {
  children: React.ReactNode;
  className?: string;
  range?: [number, number];
}) {
  const progress = useSectionProgress();
  const shouldReduceMotion = useReducedMotion();
  const opacity = useTransform(progress, range, [0, 1]);
  const y = useTransform(progress, range, [60, 0]);

  return (
    <motion.div className={className} style={{ opacity: shouldReduceMotion ? 1 : opacity, y: shouldReduceMotion ? 0 : y }}>
      {children}
    </motion.div>
  );
}

/**
 * Mount-once entrance, used only by section 1: it's already in view at
 * scroll position 0, so there's no "entering" scroll phase to scrub against
 * (its scrollYProgress starts partway through the range, not at 0).
 */
function OnLoadReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Every section's content fades/slides out as it's scrolled past — applied
 * uniformly by CinematicSection so individual sections don't need to remember
 * it. Combined with ScrollReveal/OnLoadReveal (a second, nested motion.div)
 * for the entrance, since mixing an `animate`-driven and a `style`-driven
 * MotionValue on the same opacity would fight each other.
 */
function ExitFade({ children, className }: { children: React.ReactNode; className?: string }) {
  const progress = useSectionProgress();
  const shouldReduceMotion = useReducedMotion();
  const opacity = useTransform(progress, [0.7, 0.92], [1, 0]);
  const y = useTransform(progress, [0.7, 0.92], [0, -50]);

  return (
    <motion.div className={className} style={{ opacity: shouldReduceMotion ? 1 : opacity, y: shouldReduceMotion ? 0 : y }}>
      {children}
    </motion.div>
  );
}

/**
 * The sticky <header> sits in normal document flow above the hero (it isn't
 * overlaid), so section 1 needs to fill the viewport *minus* the header's
 * real height, not a flat 100dvh — otherwise its bottom edge (and the
 * scroll-down cue anchored to it) renders below the fold on load. Measured
 * rather than hardcoded since the header's height varies (mobile nav, and
 * the top banner text can wrap on narrow viewports).
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

function CinematicSection({
  src,
  alt,
  priority = false,
  overlayClassName = 'bg-gradient-to-b from-black/35 via-black/45 to-black/70',
  fadeToCream = false,
  style,
  children,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  overlayClassName?: string;
  fadeToCream?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  // Parallax: the background drifts noticeably slower/faster than the
  // scroll — reads as camera depth without the fragility of a pinned
  // crossfade between sections.
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  return (
    <section ref={sectionRef} className="relative h-dvh w-full overflow-hidden" style={style}>
      <motion.div
        className="absolute inset-0 scale-110"
        style={{ y: shouldReduceMotion ? '0%' : parallaxY }}
      >
        <Image src={src} alt={alt} fill priority={priority} sizes="100vw" className="object-cover" />
      </motion.div>

      <div className={`absolute inset-0 ${overlayClassName}`} />
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN_URL}")` }}
      />
      {fadeToCream && (
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#FAF6EE]" />
      )}

      <SectionProgressContext.Provider value={scrollYProgress}>
        <div className="relative z-10 h-full w-full flex items-center">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 w-full">
            <ExitFade>{children}</ExitFade>
          </div>
        </div>
      </SectionProgressContext.Provider>
    </section>
  );
}

/**
 * Editorial pill CTA — small and understated ("READ ARTICLE"-style), not a
 * big button. Both hero CTAs point at the same catalog anchor. Lenis
 * (mounted in page.tsx, options.anchors: true) intercepts the click and
 * smooth-scrolls there; a plain hash-anchor jump is the fallback if it isn't
 * mounted (reduced motion) or JS hasn't loaded yet.
 */
function PillLink({ children }: { children: React.ReactNode }) {
  return (
    <a
      href="#rahnamolar"
      className="inline-flex items-center gap-2 rounded-full bg-amber-300 hover:bg-amber-200 text-amber-950 text-xs font-bold px-5 py-2.5 transition-colors"
    >
      {children}
    </a>
  );
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

/**
 * The section-progress chrome (top-right counter, left-edge ticks) tracks
 * scroll across the whole 4-section hero, separate from each section's own
 * local scroll progress. sticky (not fixed) so it's pinned only while the
 * hero itself is in view, and disappears naturally once scrolled past.
 */
function useHeroProgress(heroRef: React.RefObject<HTMLDivElement | null>) {
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end end'] });
  const [activeIndex, setActiveIndex] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActiveIndex(Math.min(SECTION_COUNT - 1, Math.floor(v * SECTION_COUNT)));
  });

  return activeIndex;
}

export default function CinematicHero() {
  const shouldReduceMotion = useReducedMotion();
  const headerHeight = useHeaderHeight();
  const heroRef = useRef<HTMLDivElement>(null);
  const activeIndex = useHeroProgress(heroRef);
  const tickTransition = shouldReduceMotion ? '' : 'transition-all duration-300';

  return (
    <div ref={heroRef} className="relative w-full bg-[#0d0a06]">
      {/* Top-right section counter + sound toggle */}
      <div className="sticky top-6 z-30 pointer-events-none">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex justify-end items-center gap-2 pointer-events-auto">
          <SoundToggle />
          <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 backdrop-blur-xs px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-amber-100">
            {String(activeIndex + 1).padStart(2, '0')} — {String(SECTION_COUNT).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Left-edge scroll ticks — hidden below sm: at narrow widths the centered
          headline text starts too close to the viewport edge to leave room. */}
      <div className="hidden sm:block sticky top-1/2 -translate-y-1/2 z-30 pointer-events-none pl-4 sm:pl-6 h-0">
        <div className="flex flex-col gap-3">
          {Array.from({ length: SECTION_COUNT }).map((_, i) => (
            <span
              key={i}
              className={`block w-1.5 rounded-full ${tickTransition} ${
                i === activeIndex ? 'h-5 bg-amber-300' : 'h-2.5 bg-white/25'
              }`}
            />
          ))}
        </div>
      </div>

      <CinematicSection
        src="/giant-moon-desert-caravan.jpg"
        alt="Karvon sahroda, ulkan oy ostida"
        priority
        style={headerHeight ? { height: `calc(100dvh - ${headerHeight}px)` } : undefined}
      >
        <div className="flex flex-col items-center text-center gap-6">
          <OnLoadReveal className="flex flex-col items-center gap-5">
            <p className="font-serif italic text-sm sm:text-base text-amber-200/80 tracking-wide">
              Ipak yo&apos;li karyera platformasi
            </p>

            <h1
              className={`${anton.className} uppercase text-5xl sm:text-7xl lg:text-8xl text-amber-50 leading-[0.95] tracking-tight max-w-5xl`}
            >
              Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
            </h1>

            <PillLink>
              Rahnamolarni ko&apos;rish <span aria-hidden>↓</span>
            </PillLink>
          </OnLoadReveal>

          <OnLoadReveal
            delay={0.35}
            className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-amber-100/70"
          >
            <span>50+ Top Rahnamolar</span>
            <span className="opacity-40">•</span>
            <span>1,200+ Muvaffaqiyatli Qabullar</span>
            <span className="opacity-40">•</span>
            <span className="inline-flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
              4.9 Reyting
            </span>
          </OnLoadReveal>
        </div>

        {!shouldReduceMotion && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-amber-100/70">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Pastga aylantiring</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        )}
      </CinematicSection>

      <CinematicSection src="/desert-solar-ring-eclipse.jpg" alt="Sahroda quyosh halqasi tutilishi">
        <ScrollReveal className="max-w-2xl mx-auto text-center flex flex-col items-center gap-4">
          <h2 className={`${anton.className} uppercase text-5xl sm:text-7xl lg:text-8xl text-amber-50 tracking-tight`}>
            To&apos;g&apos;ri yo&apos;l
          </h2>
          <p className="font-serif italic text-lg sm:text-2xl text-amber-100/90 leading-snug">
            Har bir muvaffaqiyatli karyera Buyuk Ipak Yo&apos;lida to&apos;g&apos;ri yo&apos;l ko&apos;rsatuvchi
            Rahnamodan boshlanadi. Tibbiyot, Huquq, Arxitektura, Dasturlash va Grantlar bo&apos;yicha 1-ga-1
            shaxsiy mentorlik oling.
          </p>
        </ScrollReveal>
      </CinematicSection>

      <CinematicSection src="/desert-night-full-moon.jpg" alt="To&apos;lin oy ostida tungi sahro">
        <ScrollReveal className="max-w-xl mx-auto text-center flex flex-col items-center gap-4">
          <h2
            className={`${anton.className} uppercase text-5xl sm:text-7xl lg:text-8xl text-amber-50 tracking-tight leading-[0.95]`}
          >
            Tunda ham yo&apos;lingizni yo&apos;qotmang
          </h2>
          <p className="font-serif italic text-lg sm:text-2xl text-amber-200/90">
            Rahnamongiz doim yoningizda.
          </p>
        </ScrollReveal>
      </CinematicSection>

      <CinematicSection
        src="/desert-sand-ripples.jpg"
        alt="Sahro qumidagi to'lqinsimon izlar"
        overlayClassName="bg-gradient-to-b from-black/40 via-black/50 to-black/60"
        fadeToCream
      >
        <ScrollReveal className="max-w-xl mx-auto text-center flex flex-col items-center gap-5">
          <div className="space-y-2">
            <h2 className={`${anton.className} uppercase text-5xl sm:text-7xl lg:text-8xl text-amber-50 tracking-tight`}>
              Endi navbat sizniki
            </h2>
            <p className="font-serif italic text-lg sm:text-2xl text-amber-200/90">
              O&apos;z Rahnamongizni tanlang.
            </p>
          </div>

          <PillLink>
            Rahnamolarni ko&apos;rish <span aria-hidden>→</span>
          </PillLink>
        </ScrollReveal>
      </CinematicSection>
    </div>
  );
}
