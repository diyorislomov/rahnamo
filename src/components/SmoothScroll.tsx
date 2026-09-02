'use client';

import { ReactLenis } from 'lenis/react';

/**
 * Homepage-only smooth-scroll (inertia/easing on wheel & touch). Mounted from
 * page.tsx, not the root layout, so booking, payment, /admin and
 * /my-bookings keep plain native scroll.
 *
 * `respectReducedMotion` is Lenis's own built-in handling: under
 * prefers-reduced-motion it forces 1:1 tracking (no smoothing) and makes
 * programmatic scrolls instant, so there's no need to duplicate that check
 * here. `anchors: true` makes the hero's existing `<a href="#rahnamolar">`
 * CTAs scroll smoothly with zero extra wiring in CinematicHero.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={{ autoRaf: true, anchors: true, respectReducedMotion: true }}>
      {children}
    </ReactLenis>
  );
}
