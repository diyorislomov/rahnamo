'use client';

import React from 'react';

interface RahnamoLogoProps {
  className?: string;
  variant?: 'full' | 'monogram';
  light?: boolean;
}

export default function RahnamoLogo({ className = "h-11", light = false }: RahnamoLogoProps) {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      {light ? (
        <img
          src="/brand-horizontal-transparent.png"
          alt="RAHNAMO — GUIDE. GROW. ACHIEVE."
          className="h-full w-auto object-contain"
        />
      ) : (
        <img
          src="/brand-horizontal-for-light-bg.png"
          alt="RAHNAMO — GUIDE. GROW. ACHIEVE."
          className="h-full w-auto object-contain"
        />
      )}
    </div>
  );
}

export function RahnamoMonogram({ className = "h-9 w-9", light = false }: { className?: string; light?: boolean }) {
  return (
    <img
      src={light ? "/brand-horizontal-transparent.png" : "/brand-horizontal-for-light-bg.png"}
      alt="RAHNAMO"
      className={`${className} object-contain`}
    />
  );
}
