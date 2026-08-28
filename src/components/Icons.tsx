import React from 'react';

// Geometric Camel Brand Silhouette
export function CamelIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M19.5 4.5c-.83 0-1.5.67-1.5 1.5v1.2l-2.1-1.4c-.6-.4-1.3-.6-2-.5l-1.4.2c-.7-1.2-2-2-3.5-2-1.3 0-2.5.6-3.2 1.6l-1.6 2.4H2c-.55 0-1 .45-1 1s.45 1 1 1h1.2l.6 5.5c.1 1 .9 1.8 1.9 1.9l.3 4.6c0 .6.4 1 1 1s1-.4 1-1v-4.5h2v4.5c0 .6.4 1 1 1s1-.4 1-1v-4.5h2v4.5c0 .6.4 1 1 1s1-.4 1-1v-4.8l2.2-2.2c.5-.5.8-1.2.8-2V6c0-.83-.67-1.5-1.5-1.5z" />
    </svg>
  );
}

// Guiding Star of Rahnamo
export function GuidingStarIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14.2 8.6L21 9.4L15.8 13.9L17.4 20.6L12 16.9L6.6 20.6L8.2 13.9L3 9.4L9.8 8.6L12 2Z" />
    </svg>
  );
}

// Minimalist Editorial Hero Illustration: Caravan Crossing Dunes at Sunset
export function CaravanHeroIllustration() {
  return (
    <svg
      viewBox="0 0 1200 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-4xl mx-auto h-auto select-none"
    >
      <defs>
        <linearGradient id="skyGlow" x1="600" y1="0" x2="600" y2="280" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" stopOpacity="0.18" />
          <stop offset="0.6" stopColor="#D97706" stopOpacity="0.08" />
          <stop offset="1" stopColor="#FAF6EE" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="duneBack" x1="0" y1="180" x2="1200" y2="320" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E2D4BE" />
          <stop offset="1" stopColor="#D5C3A5" />
        </linearGradient>
        <linearGradient id="duneFront" x1="0" y1="210" x2="1200" y2="320" gradientUnits="userSpaceOnUse">
          <stop stopColor="#CDB591" />
          <stop offset="1" stopColor="#BFA37B" />
        </linearGradient>
      </defs>

      {/* Soft Sunset Glow */}
      <circle cx="600" cy="160" r="140" fill="url(#skyGlow)" />

      {/* Guiding Star above caravan */}
      <path d="M470 70L474 88L492 92L474 96L470 114L466 96L448 92L466 88L470 70Z" fill="#B45309" />
      <circle cx="470" cy="92" r="3" fill="#FAF6EE" />

      {/* Distant Caravanserai Dome */}
      <path
        d="M840 185C840 165 855 150 875 150C895 150 910 165 910 185H840Z"
        fill="#9A7B56"
        fillOpacity="0.4"
      />
      <rect x="872" y="138" width="6" height="12" fill="#9A7B56" fillOpacity="0.4" />
      <rect x="830" y="185" width="90" height="25" rx="4" fill="#9A7B56" fillOpacity="0.3" />

      {/* Back Sand Dune Layer */}
      <path
        d="M0 220C240 160 480 240 760 190C980 150 1100 180 1200 195V320H0V220Z"
        fill="url(#duneBack)"
      />

      {/* Caravan Silhouette Group (Leader + 3 Camels Connected by Guide Lines) */}
      <g fill="#451A03" opacity="0.88">
        {/* Guiding Person */}
        <circle cx="420" cy="180" r="5" />
        <path d="M417 186H423L425 208H415L417 186Z" />
        <line x1="424" y1="192" x2="445" y2="188" stroke="#451A03" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Lead Camel */}
        <g transform="translate(445, 155) scale(0.95)">
          <path d="M28 2c-1.1 0-2 .9-2 2v2.5l-3.5-2.2c-.8-.5-1.8-.7-2.7-.6l-2 .3c-.9-1.6-2.6-2.7-4.7-2.7-1.8 0-3.4.8-4.4 2.2l-2.2 3.3H2c-.7 0-1.3.6-1.3 1.3s.6 1.3 1.3 1.3h1.6l.8 7.5c.2 1.3 1.2 2.4 2.5 2.6l.4 6.2c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4v-6.1h2.7v6.1c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4v-6.1h2.7v6.1c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4v-6.5l3-3c.7-.7 1.1-1.6 1.1-2.7V4c0-1.1-.9-2-2-2z" />
        </g>

        <line x1="478" y1="184" x2="510" y2="188" stroke="#451A03" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Second Camel */}
        <g transform="translate(510, 158) scale(0.88)">
          <path d="M28 2c-1.1 0-2 .9-2 2v2.5l-3.5-2.2c-.8-.5-1.8-.7-2.7-.6l-2 .3c-.9-1.6-2.6-2.7-4.7-2.7-1.8 0-3.4.8-4.4 2.2l-2.2 3.3H2c-.7 0-1.3.6-1.3 1.3s.6 1.3 1.3 1.3h1.6l.8 7.5c.2 1.3 1.2 2.4 2.5 2.6l.4 6.2c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4v-6.1h2.7v6.1c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4v-6.1h2.7v6.1c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4v-6.5l3-3c.7-.7 1.1-1.6 1.1-2.7V4c0-1.1-.9-2-2-2z" />
        </g>

        <line x1="540" y1="186" x2="570" y2="190" stroke="#451A03" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Third Camel */}
        <g transform="translate(570, 162) scale(0.82)">
          <path d="M28 2c-1.1 0-2 .9-2 2v2.5l-3.5-2.2c-.8-.5-1.8-.7-2.7-.6l-2 .3c-.9-1.6-2.6-2.7-4.7-2.7-1.8 0-3.4.8-4.4 2.2l-2.2 3.3H2c-.7 0-1.3.6-1.3 1.3s.6 1.3 1.3 1.3h1.6l.8 7.5c.2 1.3 1.2 2.4 2.5 2.6l.4 6.2c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4v-6.1h2.7v6.1c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4v-6.1h2.7v6.1c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4v-6.5l3-3c.7-.7 1.1-1.6 1.1-2.7V4c0-1.1-.9-2-2-2z" />
        </g>
      </g>

      {/* Foreground Sand Dune Layer */}
      <path
        d="M0 250C320 220 540 280 880 230C1040 205 1140 225 1200 240V320H0V250Z"
        fill="url(#duneFront)"
      />
    </svg>
  );
}

// Payment System Badges
export function PaymeBadge() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00CCCC]/10 border border-[#00CCCC]/30 rounded-xl text-[#008B8B] font-bold text-xs">
      <span className="w-2 h-2 rounded-full bg-[#00CCCC]" />
      Payme
    </div>
  );
}

export function ClickBadge() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0073FF]/10 border border-[#0073FF]/30 rounded-xl text-[#0052B4] font-bold text-xs">
      <span className="w-2 h-2 rounded-full bg-[#0073FF]" />
      Click
    </div>
  );
}

export function UzumBadge() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7000FF]/10 border border-[#7000FF]/30 rounded-xl text-[#5200BA] font-bold text-xs">
      <span className="w-2 h-2 rounded-full bg-[#7000FF]" />
      Uzum Bank
    </div>
  );
}