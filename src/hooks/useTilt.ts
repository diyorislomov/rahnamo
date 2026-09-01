'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * Pointer-driven 3D tilt for cards.
 *
 * Writes CSS custom properties directly on the node instead of going through
 * React state, so a hovered card never re-renders the grid around it. Pointer
 * events are coalesced into a single rAF, keeping it to one layout read per
 * frame even with a dozen cards mounted.
 *
 * Fully inert on touch devices and under prefers-reduced-motion: the handlers
 * bail before touching the DOM, so mobile pays nothing for this.
 */

const MAX_TILT_DEG = 7;
const LIFT_PX = 8;

export function useTilt<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const enabledRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    pointerRef.current = null;
    el.classList.remove('is-tilting');
    el.style.setProperty('--tilt-rx', '0deg');
    el.style.setProperty('--tilt-ry', '0deg');
    el.style.setProperty('--tilt-lift', '0px');
    el.style.setProperty('--sheen-opacity', '0');
  }, []);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const sync = () => {
      enabledRef.current = fine.matches && !reduced.matches;
      if (!enabledRef.current) reset();
    };

    sync();
    fine.addEventListener('change', sync);
    reduced.addEventListener('change', sync);

    return () => {
      fine.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [reset]);

  const apply = useCallback(() => {
    frameRef.current = null;
    const el = ref.current;
    const pointer = pointerRef.current;
    if (!el || !pointer) return;

    // Read the rect here rather than on every pointermove: at most one layout
    // read per frame, and it stays correct if the page scrolls while hovered.
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Normalised to [-0.5, 0.5] from the card's centre.
    const px = (pointer.clientX - rect.left) / rect.width - 0.5;
    const py = (pointer.clientY - rect.top) / rect.height - 0.5;

    el.style.setProperty('--tilt-rx', `${(-py * MAX_TILT_DEG * 2).toFixed(2)}deg`);
    el.style.setProperty('--tilt-ry', `${(px * MAX_TILT_DEG * 2).toFixed(2)}deg`);
    el.style.setProperty('--tilt-lift', `${-LIFT_PX}px`);
    el.style.setProperty('--sheen-x', `${((px + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--sheen-y', `${((py + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--sheen-opacity', '1');
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<T>) => {
      if (!enabledRef.current || event.pointerType !== 'mouse') return;
      pointerRef.current = { clientX: event.clientX, clientY: event.clientY };
      ref.current?.classList.add('is-tilting');
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(apply);
    },
    [apply]
  );

  const onPointerLeave = useCallback(() => {
    if (!enabledRef.current) return;
    reset();
  }, [reset]);

  return { ref, tiltProps: { onPointerMove, onPointerLeave } };
}
