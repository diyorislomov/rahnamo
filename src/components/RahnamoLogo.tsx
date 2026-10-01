'use client';

import React from 'react';
import Image from 'next/image';

interface RahnamoLogoProps {
  className?: string;
  variant?: 'full' | 'monogram';
  light?: boolean;
}

export default function RahnamoLogo({ className = "h-11", light = false }: RahnamoLogoProps) {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      {light ? (
        <Image
          src="/brand-horizontal-transparent.png"
          alt="RAHNAMO — GUIDE. GROW. ACHIEVE."
          width={600}
          height={160}
          className="h-full w-auto object-contain"
        />
      ) : (
        <Image
          src="/brand-horizontal-for-light-bg.png"
          alt="RAHNAMO — GUIDE. GROW. ACHIEVE."
          width={600}
          height={160}
          className="h-full w-auto object-contain"
        />
      )}
    </div>
  );
}

export function RahnamoMonogram({ className = "h-9 w-9", light = false }: { className?: string; light?: boolean }) {
  return (
    <Image
      src={light ? "/brand-horizontal-transparent.png" : "/brand-horizontal-for-light-bg.png"}
      alt="RAHNAMO"
      width={160}
      height={160}
      className={`${className} object-contain`}
    />
  );
}
