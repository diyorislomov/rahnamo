'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedNumber({ value, suffix = '', duration = 1500, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const reducedMotion = useRef(false);

  // Gate on visibility once; never re-locks, so a later change to `value`
  // (e.g. the live Supabase count replacing the mock-seeded one after this
  // already scrolled into view) still gets picked up by the effect below.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reducedMotion.current = true;
      setIsVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    if (reducedMotion.current) {
      setDisplay(value);
      return;
    }
    let cancelled = false;
    const from = display;
    const start = performance.now();
    function tick(now: number) {
      if (cancelled) return;
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from + (value - from) * easeOutCubic(progress)));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animates from the last displayed value to the new one; `display` itself must not retrigger this
  }, [value, isVisible, duration]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString('en-US')}
      {suffix}
    </span>
  );
}
