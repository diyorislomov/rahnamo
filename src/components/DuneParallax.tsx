'use client';

import { motion, useTransform, MotionValue } from 'framer-motion';

interface DuneParallaxProps {
  scrollYProgress: MotionValue<number>;
  shouldReduceMotion: boolean | null;
}

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
            style={{ opacity: 0.5, filter: 'saturate(0.5) brightness(1.25)' }}
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
            style={{ opacity: 0.75, filter: 'saturate(0.7) brightness(1.1)' }}
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
            style={{ opacity: 0.92, filter: 'saturate(0.9)' }}
          />
        </div>

        <div
          className={`absolute top-[52%] left-0 w-32 sm:w-48 ${shouldReduceMotion ? '' : 'animate-caravan-glide'}`}
        >
          <img src="/camel-caravan.svg" alt="" aria-hidden className="w-full h-auto drop-shadow-md" />
        </div>
      </motion.div>

      {/* Layer 4 -- nearest: shortest, confined to the bottom, richest color */}
      <motion.div className="absolute inset-0" style={{ y: shouldReduceMotion ? still : yNear }}>
        <div className="absolute inset-x-0 bottom-0 h-[40%]" style={{ transform: 'scaleX(-1)' }}>
          <img src="/dune-ridge.svg" alt="" aria-hidden className="w-full h-full" />
        </div>
      </motion.div>
    </div>
  );
}
