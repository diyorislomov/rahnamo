'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown, Compass, ShieldCheck, Star, Users } from 'lucide-react';

// Static SVG-noise data URI: masks the softness of the (currently ~736px)
// source photography when it's stretched full-bleed, at zero network cost.
const GRAIN_URL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>";

/**
 * Fade-up reveal, shared by the on-load hero text and the scroll-triggered
 * copy in sections 2-4. Under prefers-reduced-motion this renders straight at
 * its final state — not just an instant transition, since a whileInView
 * reveal would otherwise still stay invisible until scrolled into view, which
 * is motion-gated visibility, not truly static.
 */
function Reveal({
  children,
  className,
  delay = 0,
  onLoad = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onLoad?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const trigger = onLoad
    ? { animate: { opacity: 1, y: 0 } }
    : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.5 } };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
      {...trigger}
    >
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
  // Subtle parallax: the background drifts a few percent slower than the
  // scroll, which reads as depth without the fragility of a pinned crossfade.
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['-4%', '4%']);

  return (
    <section ref={sectionRef} className="relative h-dvh w-full overflow-hidden" style={style}>
      <motion.div
        className="absolute inset-0 scale-105"
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

      <div className="relative z-10 h-full w-full flex items-center">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 w-full">{children}</div>
      </div>
    </section>
  );
}

export default function CinematicHero() {
  const shouldReduceMotion = useReducedMotion();
  const headerHeight = useHeaderHeight();

  return (
    <div className="relative w-full bg-[#0d0a06]">
      <CinematicSection
        src="/giant-moon-desert-caravan.jpg"
        alt="Karvon sahroda, ulkan oy ostida"
        priority
        style={headerHeight ? { height: `calc(100dvh - ${headerHeight}px)` } : undefined}
      >
        <Reveal onLoad className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-amber-100 text-xs font-extrabold backdrop-blur-xs">
            <Compass className="w-4 h-4 text-amber-300" />
            <span>Ipak Yo&apos;li Karyera Karvoni</span>
          </div>

          <h1 className="font-serif font-black text-4xl sm:text-6xl lg:text-7xl text-amber-50 leading-[1.05] tracking-tight">
            Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
          </h1>

          <Reveal onLoad delay={0.35} className="flex flex-wrap items-center gap-3 text-xs font-bold pt-2">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 px-3.5 py-2 rounded-2xl text-amber-50 backdrop-blur-xs">
              <Users className="w-4 h-4 text-amber-300" />
              <span>50+ Top Rahnamolar</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 px-3.5 py-2 rounded-2xl text-amber-50 backdrop-blur-xs">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>1,200+ Muvaffaqiyatli Qabullar</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-2 rounded-2xl text-amber-50 backdrop-blur-xs">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>4.9 ★ Reyting</span>
            </div>
          </Reveal>
        </Reveal>

        {!shouldReduceMotion && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-amber-100/70">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Pastga aylantiring</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        )}
      </CinematicSection>

      <CinematicSection src="/desert-solar-ring-eclipse.jpg" alt="Sahroda quyosh halqasi tutilishi">
        <Reveal className="max-w-2xl">
          <p className="font-serif text-2xl sm:text-4xl text-amber-50 leading-snug">
            Har bir muvaffaqiyatli karyera Buyuk Ipak Yo&apos;lida to&apos;g&apos;ri yo&apos;l ko&apos;rsatuvchi
            Rahnamodan boshlanadi. Tibbiyot, Huquq, Arxitektura, Dasturlash va Grantlar bo&apos;yicha 1-ga-1
            shaxsiy mentorlik oling.
          </p>
        </Reveal>
      </CinematicSection>

      <CinematicSection src="/desert-night-full-moon.jpg" alt="To&apos;lin oy ostida tungi sahro">
        <Reveal className="max-w-xl">
          <p className="font-serif text-3xl sm:text-5xl text-amber-50 leading-tight">
            Tunda ham yo&apos;lingizni yo&apos;qotmang — Rahnamongiz doim yoningizda.
          </p>
        </Reveal>
      </CinematicSection>

      <CinematicSection
        src="/desert-sand-ripples.jpg"
        alt="Sahro qumidagi to'lqinsimon izlar"
        overlayClassName="bg-gradient-to-b from-black/40 via-black/50 to-black/60"
        fadeToCream
      >
        <Reveal className="max-w-xl space-y-2">
          <p className="font-serif text-3xl sm:text-5xl text-amber-50 leading-tight">Endi navbat sizniki.</p>
          <p className="font-serif text-3xl sm:text-5xl text-amber-200/90 leading-tight">
            O&apos;z Rahnamongizni tanlang.
          </p>
        </Reveal>
      </CinematicSection>
    </div>
  );
}
