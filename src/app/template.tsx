'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  // 3. Respect prefers-reduced-motion: 150ms fast opacity crossfade
  if (shouldReduceMotion) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className="relative w-full min-h-screen">
      {/* 🐪 2. Dune Ridge Sweep Band (#B45309 to #F59E0B) */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 h-2 bg-gradient-to-r from-[#B45309] via-[#F59E0B] to-[#D97706] shadow-md pointer-events-none"
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: [0, 1, 0], originX: [0, 0, 1] }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* 🐪 Page Content Fade + Slide Up Entry (14px) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
