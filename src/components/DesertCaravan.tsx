'use client';

import { Compass, Moon, Sparkles, Star } from 'lucide-react';
import { CamelIcon } from '@/components/Icons';

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C140F] via-[#2A1E18] to-[#120D0A] border border-amber-500/25 shadow-2xl p-6 sm:p-10 my-6 text-amber-50 group selection:bg-amber-500/30">
      
      {/* 🌙 Glowing Crescent Moon in Desert Night Sky */}
      <div className="absolute top-4 right-8 w-24 h-24 sm:w-36 sm:h-36 flex items-center justify-center pointer-events-none">
        {/* Ambient Moon Glow */}
        <div className="absolute inset-0 bg-amber-400/25 rounded-full blur-2xl animate-pulse" />
        
        {/* Crescent Moon Icon */}
        <div className="relative z-10 text-amber-300 transform -rotate-12 drop-shadow-[0_0_20px_rgba(251,191,36,0.9)]">
          <Moon className="w-16 h-16 sm:w-24 sm:h-24 fill-amber-200/90 text-amber-300" />
        </div>
      </div>

      {/* ✨ Twinkling Desert Stars Overlay Across the Entire Sky */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-85">
        <div className="absolute top-6 left-12 w-2 h-2 rounded-full bg-amber-300 animate-twinkle-fast" />
        <div className="absolute top-16 left-1/3 w-2.5 h-2.5 rounded-full bg-amber-200 animate-twinkle-slow" />
        <div className="absolute top-8 left-1/2 w-2 h-2 rounded-full bg-amber-400 animate-twinkle-fast" />
        <div className="absolute top-12 right-1/3 w-3 h-3 rounded-full bg-amber-300 animate-twinkle-slow" />
        <div className="absolute top-20 right-16 w-2 h-2 rounded-full bg-amber-200 animate-twinkle-fast" />
        <div className="absolute top-28 left-16 w-1.5 h-1.5 rounded-full bg-amber-300 animate-twinkle-slow" />
        <div className="absolute top-36 right-1/4 w-2.5 h-2.5 rounded-full bg-amber-400 animate-twinkle-fast" />
      </div>

      {/* Hero Copy Content */}
      <div className="relative z-10 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-extrabold mb-3 backdrop-blur-md shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <Compass className="w-4 h-4 text-amber-300" />
          <span>Ipak Yo'li Karyera Karvoni</span>
        </div>

        <h1 className="font-serif font-black text-2xl sm:text-4xl text-amber-100 leading-tight">
          Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
        </h1>

        <p className="text-xs sm:text-sm text-amber-200/80 mt-3 leading-relaxed font-sans">
          Har bir muvaffaqiyatli karyera yulduzli tun sahrosida to'g'ri yo'l ko'rsatuvchi Rahnamodan boshlanadi. Tibbiyot, Huquq, Arxitektura, Dasturlash va Grantlar bo'yicha 1-ga-1 shaxsiy mentorlik oling.
        </p>
      </div>

      {/* Animated 3-Layer Night Sand Dunes + Walking Camel Caravan */}
      <div className="relative mt-8 sm:mt-12 h-24 sm:h-36 w-full">
        {/* Dune Layer 1 (Far - Dark Amber) */}
        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-950/60"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,40 Q300,120 600,30 Q900,-20 1200,50 L1200,120 L0,120 Z" />
        </svg>

        {/* Dune Layer 2 (Mid - Golden Ochre) */}
        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-900/70"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,70 Q400,20 800,90 Q1050,40 1200,80 L1200,120 L0,120 Z" />
        </svg>

        {/* Dune Layer 3 (Foreground - Warm Ochre) */}
        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-800/80"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,90 Q350,50 700,100 Q1000,60 1200,95 L1200,120 L0,120 Z" />
        </svg>

        {/* Walking Camel Caravan Silhouette in Night Glow */}
        <div className="absolute bottom-3 left-6 sm:left-16 flex items-end gap-3 sm:gap-6 animate-caravan">
          {/* Lead Camel */}
          <div className="flex flex-col items-center animate-camel-bob">
            <CamelIcon className="w-9 h-9 sm:w-12 sm:h-12 text-amber-300 fill-current drop-shadow-[0_2px_8px_rgba(251,191,36,0.6)]" />
            <span className="w-2 h-0.5 bg-amber-400/40 rounded-full mt-0.5" />
          </div>
          {/* Camel 2 */}
          <div className="flex flex-col items-center animate-camel-bob [animation-delay:0.4s]">
            <CamelIcon className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 fill-current drop-shadow-sm opacity-90" />
            <span className="w-1.5 h-0.5 bg-amber-400/30 rounded-full mt-0.5" />
          </div>
          {/* Camel 3 */}
          <div className="flex flex-col items-center animate-camel-bob [animation-delay:0.8s]">
            <CamelIcon className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400/80 fill-current drop-shadow-sm opacity-80" />
            <span className="w-1.5 h-0.5 bg-amber-400/20 rounded-full mt-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
