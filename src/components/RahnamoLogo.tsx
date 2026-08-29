'use client';

import React from 'react';

interface RahnamoLogoProps {
  className?: string;
  variant?: 'full' | 'monogram';
  light?: boolean;
}

export default function RahnamoLogo({ className = "h-10", light = false }: RahnamoLogoProps) {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      {light ? (
        <img
          src="/official-logo-dark-bg.png"
          alt="RAHNAMO — GUIDE. GROW. ACHIEVE."
          className="h-full w-auto object-contain rounded-xl"
        />
      ) : (
        <img
          src="/official-logo-transparent.png"
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
      src={light ? "/official-logo-dark-bg.png" : "/official-logo-transparent.png"}
      alt="RAHNAMO"
      className={`${className} object-contain`}
    />
  );
}
