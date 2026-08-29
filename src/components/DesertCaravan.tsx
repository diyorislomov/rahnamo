'use client';

import React from 'react';
import { Compass, Star, ShieldCheck, Users } from 'lucide-react';

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#FFFDF9] via-[#FAF1DF] to-[#F3E2C4] border border-amber-900/15 shadow-lg p-6 sm:p-12 my-6 select-none group">
      
      {/* ☀️ Glowing Warm Silk Road Desert Sun */}
      <div className="absolute top-4 right-8 w-28 h-28 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600/40 opacity-80 blur-xs animate-pulse pointer-events-none" />

      {/* ✨ Twinkling Desert Stars & Ambient Sparkles Overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-6 left-12 w-1.5 h-1.5 rounded-full bg-amber-600 animate-twinkle-fast" />
        <div className="absolute top-10 left-1/3 w-2 h-2 rounded-full bg-amber-700 animate-twinkle-slow" />
        <div className="absolute top-4 right-1/4 w-1.5 h-1.5 rounded-full bg-amber-500 animate-twinkle-fast" />
        <div className="absolute top-14 right-12 w-2 h-2 rounded-full bg-amber-600 animate-twinkle-slow" />
      </div>

      {/* Hero Copy Content & Value Chips */}
      <div className="relative z-10 max-w-2xl space-y-5 text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-900/10 border border-amber-900/15 text-amber-950 text-xs font-extrabold backdrop-blur-xs shadow-2xs">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping" />
          <Compass className="w-4 h-4 text-amber-800" />
          <span>Ipak Yo'li Karyera Karvoni</span>
        </div>

        <h1 className="font-serif font-black text-3xl sm:text-5xl text-amber-950 leading-tight tracking-tight">
          Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
        </h1>

        <p className="text-xs sm:text-base text-stone-700 leading-relaxed font-sans max-w-xl">
          Har bir muvaffaqiyatli karyera Buyuk Ipak Yo'lida to'g'ri yo'l ko'rsatuvchi Rahnamodan boshlanadi. Tibbiyot, Huquq, Arxitektura, Dasturlash va Grantlar bo'yicha 1-ga-1 shaxsiy mentorlik oling.
        </p>

        {/* Value Stats Pills */}
        <div className="pt-3 flex flex-wrap items-center gap-3 text-xs font-bold font-sans">
          <div className="flex items-center gap-2 bg-amber-100/80 border border-amber-300/80 px-3.5 py-2 rounded-2xl text-amber-950 shadow-2xs">
            <Users className="w-4 h-4 text-amber-800" />
            <span>50+ Top Rahnamolar</span>
          </div>
          <div className="flex items-center gap-2 bg-amber-100/80 border border-amber-300/80 px-3.5 py-2 rounded-2xl text-amber-950 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-amber-800" />
            <span>1,200+ Muvaffaqiyatli Qabullar</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-100/80 border border-amber-300/80 px-3 py-2 rounded-2xl text-amber-900 shadow-2xs">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>4.9 ★ Reyting</span>
          </div>
        </div>
      </div>

      {/* 🌊 3-Layer Parallax Desert Sand Dunes Base */}
      <div className="relative mt-8 sm:mt-12 h-20 sm:h-28 w-full -mb-6 -mx-6 sm:-mx-12">
        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-200/60"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,40 Q300,120 600,30 Q900,-20 1200,50 L1200,120 L0,120 Z" />
        </svg>

        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-300/50"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,70 Q400,20 800,90 Q1050,40 1200,80 L1200,120 L0,120 Z" />
        </svg>

        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-400/40"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,90 Q350,50 700,100 Q1000,60 1200,95 L1200,120 L0,120 Z" />
        </svg>
      </div>

    </div>
  );
}
