'use client';

import { motion, useTransform, MotionValue } from 'framer-motion';

interface DuneParallaxProps {
  scrollYProgress: MotionValue<number>;
  shouldReduceMotion: boolean | null;
}

/**
 * Four flat SVG ridge layers, furthest to nearest, each drifting at a
 * different rate as the hero scrolls past -- classic parallax depth. Reuses
 * the walking caravan markup (and its existing walk-cycle CSS animations)
 * from DesertCaravan.tsx, riding the mid-front ridge line.
 */
export default function DuneParallax({ scrollYProgress, shouldReduceMotion }: DuneParallaxProps) {
  const yFar = useTransform(scrollYProgress, [0, 1], ['0%', '4%']);
  const yMid = useTransform(scrollYProgress, [0, 1], ['0%', '9%']);
  const yMidFront = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const yNear = useTransform(scrollYProgress, [0, 1], ['0%', '23%']);

  const still = '0%';

  return (
    <div className="absolute inset-x-0 bottom-0 h-[42%] sm:h-[46%] overflow-hidden pointer-events-none">
      {/* Warm horizon glow -- without it, near-black nearest dune (by
          design, a silhouette) has nothing to contrast against directly
          above it, and the whole band reads as an indistinct dark smudge.
          Sits behind every dune layer, in front of the starfield. */}
      <div
        className="absolute inset-x-0 bottom-0 h-full"
        style={{
          backgroundImage:
            'linear-gradient(to top, rgba(245,158,11,0.28) 0%, rgba(180,83,9,0.16) 35%, rgba(180,83,9,0) 75%)',
        }}
      />

      {/* Layer 1 -- furthest, reaches highest into the band (nothing sits in
          front of it up there), most muted/hazy */}
      <motion.div className="absolute inset-0" style={{ y: shouldReduceMotion ? still : yFar }}>
        <svg viewBox="0 0 1200 400" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path
            fill="#B45309"
            opacity="0.55"
            d="M0,90 Q220,55 460,95 Q700,125 940,70 Q1080,50 1200,85 L1200,400 L0,400 Z"
          />
        </svg>
      </motion.div>

      {/* Layer 2 -- mid-back */}
      <motion.div className="absolute inset-0" style={{ y: shouldReduceMotion ? still : yMid }}>
        <svg viewBox="0 0 1200 400" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path
            fill="#78350F"
            opacity="0.85"
            d="M0,180 Q230,150 480,185 Q720,210 950,160 Q1090,145 1200,175 L1200,400 L0,400 Z"
          />
        </svg>
      </motion.div>

      {/* Layer 3 -- mid-front, carries the caravan */}
      <motion.div className="absolute inset-0" style={{ y: shouldReduceMotion ? still : yMidFront }}>
        <svg viewBox="0 0 1200 400" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path
            fill="#1C1108"
            opacity="0.75"
            d="M0,255 Q200,230 430,260 Q650,280 890,235 Q1040,220 1200,250 L1200,400 L0,400 Z"
          />
        </svg>

        <div
          className={`absolute top-[58%] left-0 flex items-end gap-1 sm:gap-3 ${
            shouldReduceMotion ? '' : 'animate-caravan-cross'
          }`}
        >
          {/* Guide */}
          <div className={`flex flex-col items-center ${shouldReduceMotion ? '' : 'animate-man-walk'}`}>
            <svg viewBox="0 0 60 100" className="w-8 h-13 sm:w-11 sm:h-18 fill-current drop-shadow-md overflow-visible">
              <g
                className={shouldReduceMotion ? '' : 'animate-human-leg-back'}
                style={{ transformOrigin: '28px 68px' }}
              >
                <path d="M26 68 L20 94" stroke="#1C1108" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M20 94 L15 95" stroke="#1C1108" strokeWidth="4" strokeLinecap="round" />
              </g>
              <g
                className={shouldReduceMotion ? '' : 'animate-human-leg-front'}
                style={{ transformOrigin: '34px 68px' }}
              >
                <path d="M32 68 L38 94" stroke="#2C241E" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M38 94 L44 95" stroke="#2C241E" strokeWidth="4" strokeLinecap="round" />
              </g>
              <path d="M22 22 C18 34 16 52 14 70 C26 74 36 74 48 70 C44 52 42 34 38 22 Z" fill="#2C241E" />
              <path d="M26 12 C24 6 36 6 34 12 C34 16 26 16 26 12 Z" fill="#B45309" />
              <path d="M25 15 H35 V22 H25 Z" fill="#F59E0B" />
              <g className={shouldReduceMotion ? '' : 'animate-human-staff'} style={{ transformOrigin: '22px 28px' }}>
                <path d="M14 26 L8 88" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
              </g>
            </svg>
          </div>

          {/* Rope */}
          <div className="relative -mx-2 mb-6">
            <svg className="w-9 h-6" viewBox="0 0 50 30" fill="none">
              <path d="M2 12 Q24 28 48 2" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="4 3" strokeLinecap="round" />
            </svg>
          </div>

          {/* Lead camel */}
          <div className={`flex flex-col items-center ${shouldReduceMotion ? '' : 'animate-camel-bob'}`}>
            <svg viewBox="0 0 120 100" className="w-20 h-16 sm:w-28 sm:h-24 fill-current drop-shadow-md overflow-visible">
              <g
                className={shouldReduceMotion ? '' : 'animate-leg-pair-b'}
                style={{ transformOrigin: '55px 60px', animationDelay: '0.45s' }}
              >
                <path d="M40 60 L44 92" stroke="#1C1108" strokeWidth="4" strokeLinecap="round" />
                <path d="M82 60 L86 92" stroke="#1C1108" strokeWidth="4" strokeLinecap="round" />
              </g>
              <g className={shouldReduceMotion ? '' : 'animate-leg-pair-a'} style={{ transformOrigin: '55px 60px' }}>
                <path d="M32 60 L28 92" stroke="#2C241E" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M74 60 L70 92" stroke="#2C241E" strokeWidth="4.5" strokeLinecap="round" />
              </g>
              <path
                d="M14 20 C10 16 18 10 24 14 C28 18 26 32 30 40"
                stroke="#2C241E"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              <path d="M30 40 C35 20 52 20 58 40 C64 22 80 22 86 42 L28 42 Z" fill="#2C241E" />
              <path d="M42 42 H72 V58 H42 Z" fill="#B45309" />
              <path d="M26 42 L88 44 C96 50 96 62 86 64 L28 62 Z" fill="#2C241E" />
            </svg>
          </div>

          {/* Follower camel */}
          <div
            className={`flex flex-col items-center opacity-90 ${shouldReduceMotion ? '' : 'animate-camel-bob'}`}
            style={shouldReduceMotion ? undefined : { animationDelay: '0.4s' }}
          >
            <svg viewBox="0 0 120 100" className="w-16 h-13 sm:w-22 sm:h-18 fill-current drop-shadow-sm overflow-visible">
              <g
                className={shouldReduceMotion ? '' : 'animate-leg-pair-b'}
                style={{ transformOrigin: '55px 60px', animationDelay: '0.75s' }}
              >
                <path d="M40 60 L44 92" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
                <path d="M82 60 L86 92" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
              </g>
              <g
                className={shouldReduceMotion ? '' : 'animate-leg-pair-a'}
                style={{ transformOrigin: '55px 60px', animationDelay: '0.3s' }}
              >
                <path d="M32 60 L28 92" stroke="#9C4221" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M74 60 L70 92" stroke="#9C4221" strokeWidth="4.5" strokeLinecap="round" />
              </g>
              <path
                d="M15 22 C12 18 20 12 26 16 C30 20 28 32 32 40"
                stroke="#9C4221"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              <path d="M30 40 C35 20 52 20 58 40 C64 22 80 22 86 42 L28 42 Z" fill="#9C4221" />
              <path d="M26 42 L88 44 C96 50 96 62 86 64 L28 62 Z" fill="#9C4221" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Layer 4 -- nearest: right at the viewer's feet, so it's the
          shortest band of all (confined near the bottom edge), darkest,
          with a moonlit rim along its ridge */}
      <motion.div className="absolute inset-0" style={{ y: shouldReduceMotion ? still : yNear }}>
        <svg viewBox="0 0 1200 400" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path
            fill="#1C1108"
            d="M0,330 Q180,310 400,335 Q600,350 800,315 Q950,300 1100,325 Q1150,330 1200,320 L1200,400 L0,400 Z"
          />
          <path
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.5"
            d="M0,330 Q180,310 400,335 Q600,350 800,315 Q950,300 1100,325 Q1150,330 1200,320"
          />
        </svg>
      </motion.div>
    </div>
  );
}
