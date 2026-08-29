'use client';

import { Compass, Star, ShieldCheck, Users } from 'lucide-react';

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A120C] via-[#281A12] to-[#120C08] border border-amber-500/25 shadow-2xl p-6 sm:p-12 my-6 text-amber-50 group selection:bg-amber-500/30">
      
      {/* 🌌 Background Ambient Gold Glow */}
      <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-96 h-96 bg-amber-500/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-amber-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* ✨ Twinkling Starry Night Backdrop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-85">
        <div className="absolute top-6 left-12 w-2 h-2 rounded-full bg-amber-300 animate-twinkle-fast" />
        <div className="absolute top-14 left-1/3 w-2.5 h-2.5 rounded-full bg-amber-200 animate-twinkle-slow" />
        <div className="absolute top-8 right-1/3 w-2 h-2 rounded-full bg-amber-400 animate-twinkle-fast" />
        <div className="absolute top-20 right-16 w-3 h-3 rounded-full bg-amber-300 animate-twinkle-slow" />
        <div className="absolute bottom-16 left-1/4 w-2 h-2 rounded-full bg-amber-200 animate-twinkle-fast" />
        <div className="absolute top-1/2 left-8 w-1.5 h-1.5 rounded-full bg-amber-300 animate-twinkle-slow" />
        <div className="absolute top-28 right-1/4 w-2.5 h-2.5 rounded-full bg-amber-400 animate-twinkle-fast" />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Hero Title & Value Proposition */}
        <div className="lg:col-span-7 space-y-5 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-extrabold backdrop-blur-md shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <Compass className="w-4 h-4 text-amber-300" />
            <span>Ipak Yo'li Karyera Karvoni</span>
          </div>

          <h1 className="font-serif font-black text-3xl sm:text-5xl text-amber-100 leading-tight tracking-tight">
            Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
          </h1>

          <p className="text-xs sm:text-base text-amber-200/80 leading-relaxed font-sans max-w-xl">
            Har bir muvaffaqiyatli karyera yulduzli yo'lda to'g'ri yo'l ko'rsatuvchi Rahnamodan boshlanadi. Tibbiyot, Huquq, Arxitektura, Dasturlash va Grantlar bo'yicha 1-ga-1 shaxsiy yo'l-yo'riq oling.
          </p>

          {/* Value Stats Pills */}
          <div className="pt-3 flex flex-wrap items-center gap-3 text-xs font-bold font-sans">
            <div className="flex items-center gap-2 bg-amber-950/70 border border-amber-500/30 px-3.5 py-2 rounded-2xl backdrop-blur-md text-amber-200">
              <Users className="w-4 h-4 text-amber-400" />
              <span>50+ Top Rahnamolar</span>
            </div>
            <div className="flex items-center gap-2 bg-amber-950/70 border border-amber-500/30 px-3.5 py-2 rounded-2xl backdrop-blur-md text-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>1,200+ Muvaffaqiyatli Qabullar</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-950/70 border border-amber-500/30 px-3 py-2 rounded-2xl backdrop-blur-md text-amber-300">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>4.9 ★ Reyting</span>
            </div>
          </div>
        </div>

        {/* Right Column: 100% Vector Crisp Animated Guide Star, Walking Man & Camel */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between relative min-h-[360px] pt-4 select-none">
          
          {/* 🌟 1. Animated Shining North Guide Star (SVG Vector) */}
          <div className="relative animate-guide-star z-20 mb-2">
            {/* Glowing Golden Flare Halo */}
            <div className="absolute -inset-6 bg-amber-400/30 rounded-full blur-2xl animate-pulse pointer-events-none" />
            
            <svg viewBox="0 0 100 100" className="w-24 h-24 sm:w-32 sm:h-32 text-amber-300 drop-shadow-[0_0_25px_rgba(251,191,36,0.9)]" fill="currentColor">
              {/* Outer 8-Point Star Rays */}
              <path d="M50 0 L57 37 L94 44 L57 51 L50 88 L43 51 L6 44 L43 37 Z" fill="url(#starGoldGrad)" />
              {/* Inner Bright Core */}
              <path d="M50 14 L55 39 L78 44 L55 49 L50 74 L45 49 L22 44 L45 39 Z" fill="#FFF7ED" />
              <defs>
                <linearGradient id="starGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FDE68A" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* 🌊 2. Walking Caravan Group on Metallic Dunes */}
          <div className="w-full relative flex flex-col items-center justify-end z-20 mt-auto">
            
            {/* 🚶 🐪 Animated Walking Man & Camel Group */}
            <div className="relative flex items-end justify-center gap-3 animate-caravan z-20 -mb-2">
              
              {/* 🚶 RAHNAMO (MAN IN ROBES LEADING) */}
              <div className="animate-man-walk flex flex-col items-center z-10">
                <svg viewBox="0 0 60 100" className="w-10 h-16 sm:w-12 sm:h-20 text-amber-300 drop-shadow-[0_4px_12px_rgba(217,119,6,0.8)]" fill="currentColor">
                  {/* Turban / Head Cover */}
                  <path d="M25 10 C22 4 38 4 35 10 C35 15 25 15 25 10 Z" fill="#FDE68A" />
                  {/* Flowing Robe with Shading */}
                  <path d="M20 18 C16 30 14 58 12 82 C24 86 36 86 48 82 C46 58 44 30 40 18 Z" fill="url(#robeGrad)" />
                  {/* Lead Staff */}
                  <path d="M10 22 L6 84" stroke="#FDE68A" strokeWidth="3" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="robeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FDE68A" />
                      <stop offset="50%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#B45309" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* 🔗 Dynamic Leash Connector Line */}
              <svg className="w-12 h-6 text-amber-400/80 -mx-4 mb-4 z-10" viewBox="0 0 50 30" fill="none">
                <path d="M5 10 Q25 28 45 12" stroke="currentColor" strokeWidth="2.2" strokeDasharray="3 2" />
              </svg>

              {/* 🐪 3D GOLDEN CAMEL WITH GAIT ANIMATION */}
              <div className="animate-camel-bob flex flex-col items-center">
                <svg viewBox="0 0 120 100" className="w-28 h-22 sm:w-36 sm:h-28 text-amber-400 drop-shadow-[0_6px_16px_rgba(217,119,6,0.9)]" fill="currentColor">
                  {/* Camel Head & Long Neck */}
                  <path d="M14 20 C10 16 18 10 24 14 C28 18 26 30 30 38" stroke="url(#camelGoldGrad)" strokeWidth="7" strokeLinecap="round" fill="none" />
                  {/* Hump 1 */}
                  <path d="M28 38 C33 18 50 18 56 38" fill="url(#camelGoldGrad)" />
                  {/* Hump 2 */}
                  <path d="M54 38 C60 20 76 20 82 40" fill="url(#camelGoldGrad2)" />
                  {/* Main Body */}
                  <path d="M26 40 L86 42 C94 48 94 60 84 62 L28 60 Z" fill="url(#camelGoldGrad)" />
                  {/* Front & Rear Legs with Foot Details */}
                  <path d="M32 60 L30 92 M40 60 L42 90 M74 60 L72 92 M82 60 L84 90" stroke="#D97706" strokeWidth="4.5" strokeLinecap="round" />
                  {/* Tail */}
                  <path d="M86 46 Q96 54 92 66" stroke="#B45309" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <defs>
                    <linearGradient id="camelGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FDE68A" />
                      <stop offset="60%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#D97706" />
                    </linearGradient>
                    <linearGradient id="camelGoldGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#B45309" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

            </div>

            {/* 🌊 Golden Sand Dune Curve Base (Crisp Vector) */}
            <div className="w-full relative z-10 flex justify-center">
              <svg className="w-full h-14 sm:h-18 text-amber-500/80 drop-shadow-md" viewBox="0 0 400 60" preserveAspectRatio="none">
                <path d="M0 35 Q100 10 200 35 Q300 60 400 30 L400 60 L0 60 Z" fill="url(#duneGoldGrad)" />
                <path d="M0 45 Q150 20 300 48 L400 40 L400 60 L0 60 Z" fill="url(#duneGoldGrad2)" opacity="0.7" />
                <defs>
                  <linearGradient id="duneGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D97706" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#B45309" />
                  </linearGradient>
                  <linearGradient id="duneGoldGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#B45309" />
                    <stop offset="100%" stopColor="#78350F" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
