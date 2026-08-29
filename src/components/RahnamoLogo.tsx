'use client';

import React from 'react';

interface RahnamoLogoProps {
  className?: string;
  variant?: 'full' | 'monogram' | 'horizontal';
  light?: boolean;
}

export function RahnamoMonogram({ className = "w-8 h-8", light = false }: { className?: string; light?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background shape (optional app icon style) */}
      <rect width="100" height="100" rx="22" fill={light ? "#FAF6EE" : "#2C241E"} />
      
      {/* "R" Stem Left */}
      <path
        d="M26 22 H42 V78 H26 V22 Z"
        fill={light ? "#2C241E" : "#FAF6EE"}
      />

      {/* "R" Loop Top */}
      <path
        d="M42 22 H64 C73.5 22 80 27.5 80 37 C80 46.5 73.5 52 64 52 H42 V22 Z M42 34 V40 H60 C64 40 67 39 67 37 C67 35 64 34 60 34 H42 Z"
        fill={light ? "#2C241E" : "#FAF6EE"}
      />

      {/* Ascending Silk Road Path Leg */}
      <path
        d="M42 52 C52 52 60 62 76 78 H60 C48 66 44 60 42 58 V52 Z"
        fill="#D97706"
      />
      <path
        d="M52 60 C60 66 68 73 84 78 H72 C59 73 53 67 46 62 V60 Z"
        fill="#F59E0B"
      />

      {/* Guide Star inside "R" Loop */}
      <path
        d="M60 27 L61.5 32 L66.5 33.5 L61.5 35 L60 40 L58.5 35 L53.5 33.5 L58.5 32 Z"
        fill="#F59E0B"
      />
    </svg>
  );
}

export default function RahnamoLogo({ className = "h-9", variant = 'full', light = false }: RahnamoLogoProps) {
  if (variant === 'monogram') {
    return <RahnamoMonogram className={className} light={light} />;
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Monogram */}
      <svg
        viewBox="0 0 100 100"
        className="h-full w-auto aspect-square flex-shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="100" height="100" rx="22" fill={light ? "#FAF6EE" : "#2C241E"} />
        <path d="M26 22 H42 V78 H26 V22 Z" fill={light ? "#2C241E" : "#FAF6EE"} />
        <path
          d="M42 22 H64 C73.5 22 80 27.5 80 37 C80 46.5 73.5 52 64 52 H42 V22 Z M42 34 V40 H60 C64 40 67 39 67 37 C67 35 64 34 60 34 H42 Z"
          fill={light ? "#2C241E" : "#FAF6EE"}
        />
        <path d="M42 52 C52 52 60 62 76 78 H60 C48 66 44 60 42 58 V52 Z" fill="#D97706" />
        <path d="M52 60 C60 66 68 73 84 78 H72 C59 73 53 67 46 62 V60 Z" fill="#F59E0B" />
        <path d="M60 27 L61.5 32 L66.5 33.5 L61.5 35 L60 40 L58.5 35 L53.5 33.5 L58.5 32 Z" fill="#F59E0B" />
      </svg>

      {/* Typography */}
      <div className="flex flex-col justify-center">
        <span className={`font-serif font-extrabold tracking-wider leading-none text-xl sm:text-2xl ${light ? 'text-[#FAF6EE]' : 'text-[#2C241E]'}`}>
          RAHNAMO
        </span>
        <span className="text-[9px] sm:text-[10px] font-sans font-bold tracking-widest text-[#D97706] uppercase mt-0.5">
          GUIDE. GROW. ACHIEVE.
        </span>
      </div>
    </div>
  );
}
