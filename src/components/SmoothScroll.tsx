import type { ReactNode } from 'react';

// Native scrolling preserves keyboard, browser history, and reduced-motion behavior.
export default function SmoothScroll({ children }: { children: ReactNode }) {
  return children;
}
