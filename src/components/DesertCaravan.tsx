'use client';

import React from 'react';
import { Compass, Star, ShieldCheck, Users } from 'lucide-react';

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-amber-500/25 shadow-2xl my-6 text-amber-50 group selection:bg-amber-500/30 min-h-[460px] flex items-center">
      
      {/* 🌕 Photo-Realistic Giant Moon Desert Caravan Background Image */}
      <img
        src="/giant-moon-desert-caravan.jpg"
        alt="Photo-realistic Giant Moon Desert Caravan"
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-95 contrast-105 transform scale-105 group-hover:scale-110 transition-transform duration-1000"
      />

      {/* Dark Moonlit Gradient Overlay on Left Side to Guarantee Zero Text Overlap */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#120B06]/95 via-[#1A1009]/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#120B06]/90 via-transparent to-[#120B06]/50" />

      {/* 🌟 Radiant Shining Moon Glow Halo over Giant Moon */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-amber-200/20 blur-3xl pointer-events-none animate-pulse" />

      {/* ✨ Live Twinkling Stars Overlay Across Sky */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-85">
        <div className="absolute top-6 left-16 w-2 h-2 rounded-full bg-amber-200 animate-twinkle-fast" />
        <div className="absolute top-16 left-1/3 w-2.5 h-2.5 rounded-full bg-amber-100 animate-twinkle-slow" />
        <div className="absolute top-8 right-1/4 w-2 h-2 rounded-full bg-amber-300 animate-twinkle-fast" />
        <div className="absolute top-20 right-16 w-3 h-3 rounded-full bg-amber-200 animate-twinkle-slow" />
        <div className="absolute bottom-20 left-1/4 w-2 h-2 rounded-full bg-amber-100 animate-twinkle-fast" />
      </div>

      {/* Hero Content (Non-Overlapping Glassmorphism Card) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 py-10">
        <div className="max-w-xl bg-[#140C07]/80 backdrop-blur-xl border border-amber-500/25 p-6 sm:p-10 rounded-3xl shadow-2xl space-y-5 text-left">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-extrabold backdrop-blur-md shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <Compass className="w-4 h-4 text-amber-300" />
            <span>Ipak Yo'li Karyera Karvoni</span>
          </div>

          <h1 className="font-serif font-black text-3xl sm:text-5xl text-amber-100 leading-tight tracking-tight">
            Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
          </h1>

          <p className="text-xs sm:text-base text-amber-200/80 leading-relaxed font-sans max-w-xl">
            Har bir muvaffaqiyatli karyera Buyuk Ipak Yo'lida to'g'ri yo'l ko'rsatuvchi Rahnamodan boshlanadi. Tibbiyot, Huquq, Arxitektura, Dasturlash va Grantlar bo'yicha 1-ga-1 shaxsiy mentorlik oling.
          </p>

          {/* Value Stats Pills */}
          <div className="pt-3 flex flex-wrap items-center gap-3 text-xs font-bold font-sans">
            <div className="flex items-center gap-2 bg-stone-950/80 border border-amber-500/30 px-3.5 py-2 rounded-2xl backdrop-blur-md text-amber-200">
              <Users className="w-4 h-4 text-amber-400" />
              <span>50+ Top Rahnamolar</span>
            </div>
            <div className="flex items-center gap-2 bg-stone-950/80 border border-amber-500/30 px-3.5 py-2 rounded-2xl backdrop-blur-md text-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>1,200+ Muvaffaqiyatli Qabullar</span>
            </div>
            <div className="flex items-center gap-1.5 bg-stone-950/80 border border-amber-500/30 px-3 py-2 rounded-2xl backdrop-blur-md text-amber-300">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>4.9 ★ Reyting</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
