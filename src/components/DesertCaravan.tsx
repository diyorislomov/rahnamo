'use client';

import { Compass, Star, ShieldCheck, Users, Moon, Sparkles } from 'lucide-react';
import { CamelIcon } from '@/components/Icons';

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-sky-400/25 shadow-2xl my-6 text-slate-100 group selection:bg-sky-500/30 min-h-[460px] flex items-center">
      
      {/* 🌌 Ultra-Realistic Full Moon Desert Night Background Photo */}
      <img
        src="/desert-night-full-moon.jpg"
        alt="Photo-realistic Full Moon Desert Night"
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-95 contrast-105 transform scale-105 group-hover:scale-110 transition-transform duration-1000"
      />

      {/* Dark Moonlit Vignette & Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#090D16]/95 via-[#0D1322]/80 to-[#0A0E1A]/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-transparent to-[#090D16]/60" />

      {/* 🌟 Radiant Full Moon Glow Halo in Upper Right Sky */}
      <div className="absolute top-8 right-16 sm:right-28 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-sky-200/25 blur-3xl pointer-events-none animate-pulse" />

      {/* ✨ Live Twinkling Stars Field Overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-90">
        <div className="absolute top-8 left-16 w-2 h-2 rounded-full bg-sky-200 animate-twinkle-fast" />
        <div className="absolute top-20 left-1/3 w-2.5 h-2.5 rounded-full bg-white animate-twinkle-slow" />
        <div className="absolute top-12 left-1/2 w-2 h-2 rounded-full bg-sky-100 animate-twinkle-fast" />
        <div className="absolute top-16 right-1/3 w-3 h-3 rounded-full bg-white animate-twinkle-slow" />
        <div className="absolute top-24 right-20 w-2 h-2 rounded-full bg-sky-200 animate-twinkle-fast" />
        <div className="absolute top-32 left-24 w-1.5 h-1.5 rounded-full bg-sky-100 animate-twinkle-slow" />
        <div className="absolute bottom-28 right-1/4 w-2.5 h-2.5 rounded-full bg-white animate-twinkle-fast" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Premium Dark Glassmorphism Content Card */}
        <div className="lg:col-span-7 bg-[#0B101D]/75 backdrop-blur-xl border border-sky-400/20 p-6 sm:p-10 rounded-3xl shadow-2xl space-y-5 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-extrabold backdrop-blur-md shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-300 animate-ping" />
            <Compass className="w-4 h-4 text-sky-300" />
            <span>Ipak Yo'li Karyera Karvoni</span>
          </div>

          <h1 className="font-serif font-black text-3xl sm:text-5xl text-slate-100 leading-tight tracking-tight">
            Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
          </h1>

          <p className="text-xs sm:text-base text-slate-300/90 leading-relaxed font-sans max-w-xl">
            Har bir muvaffaqiyatli karyera yulduzli va to'lin oyli tunda to'g'ri yo'l ko'rsatuvchi Rahnamodan boshlanadi. Tibbiyot, Huquq, Arxitektura, Dasturlash va Grantlar bo'yicha 1-ga-1 shaxsiy mentorlik oling.
          </p>

          {/* Value Stats Pills */}
          <div className="pt-3 flex flex-wrap items-center gap-3 text-xs font-bold font-sans">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-sky-400/25 px-3.5 py-2 rounded-2xl backdrop-blur-md text-sky-200">
              <Users className="w-4 h-4 text-sky-400" />
              <span>50+ Top Rahnamolar</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 border border-sky-400/25 px-3.5 py-2 rounded-2xl backdrop-blur-md text-sky-200">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>1,200+ Muvaffaqiyatli Qabullar</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-sky-400/25 px-3 py-2 rounded-2xl backdrop-blur-md text-amber-300">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>4.9 ★ Reyting</span>
            </div>
          </div>
        </div>

        {/* Right Column: Animated Walking Camel Caravan Silhouettes on Moonlit Dunes */}
        <div className="lg:col-span-5 flex items-end justify-center relative h-64 sm:h-80">
          {/* Walking Camel Caravan Silhouette along the Moonlit Dune */}
          <div className="absolute bottom-4 right-4 sm:right-12 flex items-end gap-3 sm:gap-6 animate-caravan z-20">
            {/* Lead Camel */}
            <div className="flex flex-col items-center animate-camel-bob">
              <CamelIcon className="w-10 h-10 sm:w-14 sm:h-14 text-slate-100 fill-current drop-shadow-[0_2px_12px_rgba(186,230,253,0.9)]" />
              <span className="w-2.5 h-0.5 bg-sky-200/50 rounded-full mt-0.5" />
            </div>
            {/* Camel 2 */}
            <div className="flex flex-col items-center animate-camel-bob [animation-delay:0.4s]">
              <CamelIcon className="w-8 h-8 sm:w-11 sm:h-11 text-slate-200 fill-current opacity-90 drop-shadow-[0_2px_8px_rgba(186,230,253,0.7)]" />
              <span className="w-2 h-0.5 bg-sky-200/40 rounded-full mt-0.5" />
            </div>
            {/* Camel 3 */}
            <div className="flex flex-col items-center animate-camel-bob [animation-delay:0.8s]">
              <CamelIcon className="w-7 h-7 sm:w-9 sm:h-9 text-slate-300 fill-current opacity-80 drop-shadow-[0_2px_6px_rgba(186,230,253,0.5)]" />
              <span className="w-1.5 h-0.5 bg-sky-200/30 rounded-full mt-0.5" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
