'use client';

import { motion, useTransform, MotionValue } from 'framer-motion';

interface DuneParallaxProps {
  scrollYProgress: MotionValue<number>;
  shouldReduceMotion: boolean | null;
}

// Fixed pixel feather, not a percentage -- 50px reads as a soft dissolve at
// both mobile and desktop widths, where a % value would either vanish on
// small screens or look exaggerated on large ones.
const TOP_FEATHER = 'linear-gradient(to bottom, transparent 0px, black 50px)';
const featherMask = { WebkitMaskImage: TOP_FEATHER, maskImage: TOP_FEATHER };

// Sparse, static dots continuing the starfield down into the dune's upper
// silhouette -- not scroll-parallaxed (desync at this amplitude is
// imperceptible), just enough to blur the sky/ground boundary rather than
// leaving a clean cutoff between "stars" and "illustration". Layer 1's own
// box only covers the bottom 88% of this band, and the ridge fill within
// that box is shallow near the middle (where the peak is tallest) and much
// deeper everywhere else -- these top% values were picked by actually
// measuring where the illustration's fill starts at each x, not guessed,
// so they land ON the dune rather than in the transparent margin above it.
const CONTINUATION_STARS = [
  { left: '30%', top: '45%', size: 2, opacity: 0.35 },
  { left: '38%', top: '42%', size: 1.5, opacity: 0.3 },
  { left: '45%', top: '38%', size: 2, opacity: 0.4 },
  { left: '52%', top: '24%', size: 1.5, opacity: 0.28 },
  { left: '60%', top: '40%', size: 2, opacity: 0.35 },
  { left: '35%', top: '38%', size: 1.5, opacity: 0.25 },
  { left: '55%', top: '40%', size: 1.5, opacity: 0.25 },
];

/**
 * Four depth layers built from a single Recraft-generated dune ridge
 * illustration (dune-ridge.svg), reused at different heights, opacities and
 * filters, plus a real camel-caravan.svg riding the mid-front ridge line.
 *
 * Height principle (each layer paints over the ones before it in DOM order):
 * furthest layers get the TALLEST box, since nothing drawn later needs to
 * avoid covering them; nearest gets the SHORTEST, confined near the very
 * bottom, so it only paints a thin foreground strip instead of blanketing
 * everything behind it. Getting this backwards was a real bug caught during
 * verification -- layer 4 at full height was silently covering the caravan
 * on layer 3 wherever its fill happened to be opaque at that x-position.
 *
 * Compositing pass (this file's second round): the illustration's own baked
 * -in gradient reads brighter/more saturated than the surrounding sky, and
 * its top edge was a hard cutoff -- both fixed here with masking and a
 * color-grade tint using the sky's own gradient colors, not new ones.
 */
export default function DuneParallax({ scrollYProgress, shouldReduceMotion }: DuneParallaxProps) {
  const yFar = useTransform(scrollYProgress, [0, 1], ['0%', '4%']);
  const yMid = useTransform(scrollYProgress, [0, 1], ['0%', '9%']);
  const yMidFront = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const yNear = useTransform(scrollYProgress, [0, 1], ['0%', '23%']);

  const still = '0%';

  return (
    <div className="absolute inset-x-0 bottom-0 h-[42%] sm:h-[46%] overflow-hidden pointer-events-none">
      {/* Warm horizon glow behind every dune layer, in front of the starfield. */}
      <div
        className="absolute inset-x-0 bottom-0 h-full"
        style={{
          backgroundImage:
            'linear-gradient(to top, rgba(245,158,11,0.28) 0%, rgba(180,83,9,0.16) 35%, rgba(180,83,9,0) 75%)',
        }}
      />

      {/* Layer 1 -- furthest: tallest reach, hazy */}
      <motion.div className="absolute inset-0" style={{ y: shouldReduceMotion ? still : yFar }}>
        <div className="absolute inset-x-0 bottom-0 h-[88%]">
          <img
            src="/dune-ridge.svg"
            alt=""
            aria-hidden
            className="w-full h-full"
            style={{ opacity: 0.5, filter: 'saturate(0.5) brightness(1.25)', ...featherMask }}
          />
        </div>
      </motion.div>

      {/* Layer 2 -- mid-back */}
      <motion.div className="absolute inset-0" style={{ y: shouldReduceMotion ? still : yMid }}>
        <div className="absolute inset-x-0 bottom-0 h-[70%]" style={{ transform: 'scaleX(-1)' }}>
          <img
            src="/dune-ridge.svg"
            alt=""
            aria-hidden
            className="w-full h-full"
            style={{ opacity: 0.75, filter: 'saturate(0.7) brightness(1.1)', ...featherMask }}
          />
        </div>
      </motion.div>

      {/* Layer 3 -- mid-front, carries the caravan */}
      <motion.div className="absolute inset-0" style={{ y: shouldReduceMotion ? still : yMidFront }}>
        <div className="absolute inset-x-0 bottom-0 h-[55%]">
          <img
            src="/dune-ridge.svg"
            alt=""
            aria-hidden
            className="w-full h-full"
            style={{ opacity: 0.92, filter: 'saturate(0.9)', ...featherMask }}
          />
        </div>

        <div
          className={`absolute top-[52%] left-0 w-32 sm:w-48 ${shouldReduceMotion ? '' : 'animate-caravan-glide'}`}
        >
          {/* Grounding shadow -- lives in the same wrapper as the caravan so
              it inherits the exact same glide transform and never drifts
              apart from the feet it's supposed to sit under. */}
          <div
            aria-hidden
            className="absolute bottom-[2%] left-[8%] right-[8%] h-[6%] rounded-full bg-black/35 blur-[3px]"
          />
          <img src="/camel-caravan.svg" alt="" aria-hidden className="relative w-full h-auto drop-shadow-md" />
        </div>
      </motion.div>

      {/* Layer 4 -- nearest: shortest, confined to the bottom, richest color */}
      <motion.div className="absolute inset-0" style={{ y: shouldReduceMotion ? still : yNear }}>
        <div className="absolute inset-x-0 bottom-0 h-[40%]" style={{ transform: 'scaleX(-1)' }}>
          <img src="/dune-ridge.svg" alt="" aria-hidden className="w-full h-full" style={featherMask} />
        </div>
      </motion.div>

      {/* Color-grade tint at the seam -- same near-black/amber-brown values
          the sky's own gradient already uses (CinematicHero's overlay),
          multiplied over just the top of the band so whichever layer is
          tallest there picks up the sky's tail color instead of showing its
          own separate, more saturated palette. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[32%]"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, rgba(20,13,6,0.55) 0%, rgba(69,26,3,0.28) 50%, rgba(69,26,3,0) 100%)',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Stars continuing down into the dune's upper silhouette, on top of
          the color-grade tint so they still read as bright points. */}
      {CONTINUATION_STARS.map((star, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute rounded-full bg-[#FDE9C8]"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  );
}
