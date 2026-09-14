'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Deterministic PRNG so the star field is stable across renders (and across
 * visits) instead of calling Math.random() during render, which trips
 * React's `react-hooks/purity` check. Same approach as ThreeStarScene.tsx.
 */
function mulberry32(seed: number) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  radius: number;
  baseOpacity: number;
  ampOpacity: number;
  speed: number;
  phase: number;
}

function generateStars(count: number, seed: number): Star[] {
  const rand = mulberry32(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(),
      // Bias toward the upper ~70% -- stars spawning behind the dune band
      // are simply wasted draw calls since the dunes paint over them.
      y: rand() * 0.7,
      radius: 0.6 + rand() * 1.5,
      baseOpacity: 0.25 + rand() * 0.4,
      ampOpacity: 0.25 + rand() * 0.35,
      speed: 0.4 + rand() * 0.9,
      phase: rand() * Math.PI * 2,
    });
  }
  return stars;
}

const STAR_COUNT = 200;
const STAR_SEED = 0x9e3779b9;

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stars] = useState(() => generateStars(STAR_COUNT, STAR_SEED));

  // Guide star position lives in refs, not state -- it's redrawn every
  // animation frame, so putting it in React state would force a re-render
  // 60 times a second for no benefit.
  const guideX = useRef(0.5);
  const guideTargetX = useRef(0.5);
  const pointerActive = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

    let width = 0;
    let height = 0;
    const start = performance.now();

    const guideY = 0.16;
    const guideRadius = 2.6;

    const drawFrame = (time: number, guideXNow: number) => {
      if (width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        const twinkle = prefersReducedMotion
          ? 0.5
          : 0.5 + 0.5 * Math.sin(time * 0.001 * star.speed + star.phase);
        ctx.globalAlpha = star.baseOpacity + star.ampOpacity * twinkle;
        ctx.fillStyle = '#FDE9C8';
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.save();
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(guideXNow * width, guideY * height, guideRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // A ResizeObserver always fires once immediately after observe(), and
    // setting canvas.width/height -- even to an unchanged value -- clears
    // the whole bitmap per spec. Redrawing inside resize() itself (rather
    // than relying on a separate one-off draw before observing) means that
    // guaranteed callback repaints instead of wiping the canvas blank.
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFrame(prefersReducedMotion ? 0 : performance.now() - start, guideX.current);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const normalized = (e.clientX - rect.left) / rect.width;
      guideTargetX.current = Math.min(0.94, Math.max(0.06, normalized));
      pointerActive.current = true;
    };

    if (hasFinePointer) {
      window.addEventListener('pointermove', handlePointerMove);
    }

    if (prefersReducedMotion) {
      return () => {
        resizeObserver.disconnect();
        if (hasFinePointer) window.removeEventListener('pointermove', handlePointerMove);
      };
    }

    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;

      if (hasFinePointer) {
        if (!pointerActive.current) {
          // No cursor input yet -- hold center rather than drifting, since a
          // fine-pointer device is expected to eventually drive this.
          guideTargetX.current = 0.5;
        }
      } else {
        // Touch devices: slow autonomous drift across the sky.
        guideTargetX.current = 0.5 + 0.28 * Math.sin(elapsed * 0.00025);
      }

      guideX.current += (guideTargetX.current - guideX.current) * 0.035;

      drawFrame(elapsed, guideX.current);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      if (hasFinePointer) window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [stars]);

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 block" aria-hidden />
    </div>
  );
}
