'use client';

import React from 'react';

interface RahnamoLogoProps {
  className?: string;
  variant?: 'full' | 'monogram' | 'horizontal';
  light?: boolean;
}

export function RahnamoMonogram({ className = "w-9 h-9", light = false }: { className?: string; light?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background shape */}
      <rect width="120" height="120" rx="26" fill={light ? "#FAF6EE" : "#2C241E"} />
      
      {/* "R" Left Vertical Stem */}
      <path
        d="M30 25 H48 V95 H30 V25 Z"
        fill={light ? "#2C241E" : "#FAF6EE"}
      />

      {/* "R" Top Loop */}
      <path
        d="M48 25 H78 C90 25 98 32 98 44 C98 56 90 62 78 62 H48 V25 Z M48 38 V49 H75 C80 49 84 47 84 44 C84 41 80 38 75 38 H48 Z"
        fill={light ? "#2C241E" : "#FAF6EE"}
      />

      {/* Ascending Golden Road (Leg of the R) */}
      <path
        d="M48 62 C62 62 72 74 95 95 H74 C58 80 52 72 48 69 V62 Z"
        fill="#D97706"
      />
      <path
        d="M58 71 C68 78 78 86 102 95 H85 C71 88 63 80 54 74 V71 Z"
        fill="#F59E0B"
      />

      {/* 4-Point Guide Star Inside Loop */}
      <path
        d="M72 31 L74 38 L81 40 L74 42 L72 49 L70 42 L63 40 L70 38 Z"
        fill="#F59E0B"
      />
    </svg>
  );
}

export default function RahnamoLogo({ className = "h-10", variant = 'full', light = false }: RahnamoLogoProps) {
  if (variant === 'monogram') {
    return <RahnamoMonogram className={className} light={light} />;
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Monogram Badge */}
      <RahnamoMonogram className="h-full w-auto aspect-square flex-shrink-0" light={light} />

      {/* Typography & Official Tagline */}
      <div className="flex flex-col justify-center">
        <span
          className={`font-serif font-black tracking-wider leading-none text-xl sm:text-2xl ${
            light ? 'text-[#FAF6EE]' : 'text-[#2C241E]'
          }`}
          style={{ letterSpacing: '0.08em' }}
        >
          RAHNAMO
        </span>
        <span
          className="text-[8px] sm:text-[9.5px] font-sans font-extrabold tracking-widest text-[#D97706] uppercase mt-1 leading-none"
          style={{ letterSpacing: '0.18em' }}
        >
          GUIDE. GROW. ACHIEVE.
        </span>
      </div>
    </div>
  );
}
