'use client';

import React from 'react';
import { Compass, Star, ShieldCheck, Users, Sun } from 'lucide-react';
import { CamelIcon } from '@/components/Icons';

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-amber-500/30 shadow-2xl my-6 text-amber-50 group selection:bg-amber-500/30 min-h-[480px] flex items-center">
      
      {/* 🌅 Photo-Realistic Solar Ring Eclipse Desert Background */}
      <img
        src="/desert-solar-ring-eclipse.jpg"
        alt="Cinematic Solar Ring Eclipse Desert Caravan"
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-95 contrast-105 transform scale-105 group-hover:scale-110 transition-transform duration-1000"
      />

      {/* Warm Golden Haze & Vignette Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#170E08]/95 via-[#23150B]/80 to-[#1A0E06]/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#140C06] via-transparent to-[#1E1107]/60" />

      {/* 🌟 Pulsing Golden Solar Ring Eclipse Flare in Center-Right Sky */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-amber-400/20 blur-3xl pointer-events-none animate-pulse" />

      {/* ✨ Floating Golden Sandstorm Dust Particles Overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-85">
        <div className="absolute top-12 left-1/4 w-2 h-2 rounded-full bg-amber-300 animate-twinkle-fast" />
        <div className="absolute top-24 left-1/3 w-2.5 h-2.5 rounded-full bg-amber-200 animate-twinkle-slow" />
        <div className="absolute top-16 right-1/3 w-2 h-2 rounded-full bg-amber-400 animate-twinkle-fast" />
        <div className="absolute top-28 right-20 w-3 h-3 rounded-full bg-amber-300 animate-twinkle-slow" />
        <div className="absolute bottom-24 right-1/4 w-2 h-2 rounded-full bg-amber-200 animate-twinkle-fast" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Warm Dark Amber Glassmorphism Content Card */}
        <div className="lg:col-span-7 bg-[#140D07]/80 backdrop-blur-xl border border-amber-500/25 p-6 sm:p-10 rounded-3xl shadow-2xl space-y-5 text-left">
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

        {/* Right Column: Animated Horizon Journey Overlay */}
        <div className="lg:col-span-5 flex items-end justify-center relative h-64 sm:h-80 pointer-events-none">
          {/* Caravan Journey Motion Silhouette on Dunes */}
          <div className="absolute bottom-6 right-6 sm:right-16 flex items-end gap-3 sm:gap-5 animate-caravan z-20">
            <div className="flex flex-col items-center animate-camel-bob">
              <CamelIcon className="w-9 h-9 sm:w-12 sm:h-12 text-amber-200 fill-current drop-shadow-[0_2px_10px_rgba(245,158,11,0.8)]" />
            </div>
            <div className="flex flex-col items-center animate-camel-bob [animation-delay:0.4s]">
              <CamelIcon className="w-7 h-7 sm:w-10 sm:h-10 text-amber-300 fill-current opacity-90 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]" />
            </div>
            <div className="flex flex-col items-center animate-camel-bob [animation-delay:0.8s]">
              <CamelIcon className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 fill-current opacity-80 drop-shadow-[0_2px_6px_rgba(245,158,11,0.4)]" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
