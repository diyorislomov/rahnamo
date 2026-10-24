'use client';

/**
 * Clean native hardware-accelerated scroll container.
 * Eliminates virtual scroll-jacking / inertia desync that caused scroll locking
 * near dynamic accordions (FAQ), while preserving native browser smooth scrolling
 * for in-page anchor links.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
