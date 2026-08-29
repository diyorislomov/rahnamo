'use client';

import { Sparkles, Compass } from 'lucide-react';
import { CamelIcon } from '@/components/Icons';

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#FFFDF9] via-[#FAF1DF] to-[#F3E2C4] border border-amber-900/15 shadow-md p-6 sm:p-10 my-6 select-none group">
      {/* Glowing Warm Desert Sun */}
      <div className="absolute top-4 right-8 w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600/40 opacity-80 blur-xs animate-pulse" />

      {/* Twinkling Desert Stars Overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-6 left-12 w-1.5 h-1.5 rounded-full bg-amber-600 animate-twinkle-fast" />
        <div className="absolute top-10 left-1/3 w-2 h-2 rounded-full bg-amber-700 animate-twinkle-slow" />
        <div className="absolute top-4 right-1/4 w-1.5 h-1.5 rounded-full bg-amber-500 animate-twinkle-fast" />
        <div className="absolute top-14 right-12 w-2 h-2 rounded-full bg-amber-600 animate-twinkle-slow" />
      </div>

      <div className="relative z-10 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/10 border border-amber-900/15 text-amber-950 text-xs font-bold mb-3 backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
          <Compass className="w-3.5 h-3.5 text-amber-800" />
          <span>Ipak Yo'li Karyera Karvoni</span>
        </div>

        <h1 className="font-serif font-extrabold text-2xl sm:text-4xl text-amber-950 leading-tight">
          Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
        </h1>

        <p className="text-xs sm:text-sm text-stone-700 mt-3 leading-relaxed">
          Tibbiyot, Huquq, Arxitektura, Dasturlash va Biznes sohasidagi tajribali Rahnamolardan 1-ga-1 shaxsiy yo'l-yo'riq va mentorlik oling.
        </p>
      </div>

      {/* Animated 3-Layer Sand Dunes + Walking Camel Caravan */}
      <div className="relative mt-8 sm:mt-12 h-24 sm:h-36 w-full">
        {/* Dune Layer 1 (Far) */}
        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-200/50"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,40 Q300,120 600,30 Q900,-20 1200,50 L1200,120 L0,120 Z" />
        </svg>

        {/* Dune Layer 2 (Mid) */}
        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-300/40"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,70 Q400,20 800,90 Q1050,40 1200,80 L1200,120 L0,120 Z" />
        </svg>

        {/* Dune Layer 3 (Foreground) */}
        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-400/30"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,90 Q350,50 700,100 Q1000,60 1200,95 L1200,120 L0,120 Z" />
        </svg>

        {/* Walking Camel Caravan Silhouette */}
        <div className="absolute bottom-3 left-6 sm:left-16 flex items-end gap-3 sm:gap-6 animate-caravan">
          {/* Lead Camel */}
          <div className="flex flex-col items-center animate-camel-bob">
            <CamelIcon className="w-9 h-9 sm:w-12 sm:h-12 text-amber-950 fill-current drop-shadow-sm" />
            <span className="w-2 h-0.5 bg-amber-950/40 rounded-full mt-0.5" />
          </div>
          {/* Camel 2 */}
          <div className="flex flex-col items-center animate-camel-bob [animation-delay:0.4s]">
            <CamelIcon className="w-8 h-8 sm:w-10 sm:h-10 text-amber-900 fill-current drop-shadow-sm opacity-90" />
            <span className="w-1.5 h-0.5 bg-amber-950/30 rounded-full mt-0.5" />
          </div>
          {/* Camel 3 */}
          <div className="flex flex-col items-center animate-camel-bob [animation-delay:0.8s]">
            <CamelIcon className="w-6 h-6 sm:w-8 sm:h-8 text-amber-900/80 fill-current drop-shadow-sm opacity-80" />
            <span className="w-1.5 h-0.5 bg-amber-950/20 rounded-full mt-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
