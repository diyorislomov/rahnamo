'use client';

import { motion, useTransform, MotionValue } from 'framer-motion';

interface HeroHorizonProps {
  scrollYProgress: MotionValue<number>;
  shouldReduceMotion: boolean | null;
}

const WAYPOINTS = [
  { cx: 24, cy: 188, r: 1.8, opacity: 0.3 },
  { cx: 130, cy: 132, r: 1.6, opacity: 0.38 },
  { cx: 246, cy: 76, r: 1.6, opacity: 0.46 },
  { cx: 372, cy: 22, r: 2.4, opacity: 0.6 },
];

/**
 * Replaces the earlier dune-ridge/camel-caravan illustration, which read as
 * a flat sticker pasted over the starfield no matter how it was
 * color-graded. This is built entirely from the same gradient tokens and
 * plain SVG strokes used elsewhere on the site -- there's no separate
 * illustrated layer, so there's nothing to seam against the sky.
 *
 * The traced arc doesn't literally track Starfield's pointer-driven guide
 * star (the two canvases don't share coordinates) -- it just rises toward
 * the same upper region, standing in for "Rahnamo guides the way" without
 * needing exact pixel sync.
 */
export default function HeroHorizon({ scrollYProgress, shouldReduceMotion }: HeroHorizonProps) {
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '6%']);

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 h-[38%] sm:h-[42%] overflow-hidden pointer-events-none"
      style={{ y: shouldReduceMotion ? '0%' : y }}
    >
      {/* Warm horizon glow -- the same values the old dune scene used */}
      <div
        className="absolute inset-x-0 bottom-0 h-full"
        style={{
          backgroundImage:
            'linear-gradient(to top, rgba(245,158,11,0.25) 0%, rgba(180,83,9,0.14) 35%, rgba(180,83,9,0) 72%)',
        }}
      />

      {/* A single faint horizon line */}
      <div
        className="absolute inset-x-0 bottom-[14%] h-px"
        style={{
          backgroundImage:
            'linear-gradient(to right, transparent 0%, rgba(253,230,138,0.35) 50%, transparent 100%)',
        }}
      />

      {/* Guiding path -- a traced arc rising from the horizon toward the sky,
          with a few waypoint dots. The dash drifts slowly so it reads as a
          path being traveled, not a static decal. */}
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
        <path
          d="M 24 188 C 120 140, 180 60, 372 22"
          fill="none"
          stroke="#FBBF24"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="2 7"
          opacity="0.4"
          className={shouldReduceMotion ? undefined : 'animate-path-drift'}
        />
        {WAYPOINTS.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#FDE9C8" opacity={p.opacity} />
        ))}
      </svg>
    </motion.div>
  );
}
