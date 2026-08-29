'use client';

import { Compass, Star, ShieldCheck, Users, Sparkles } from 'lucide-react';

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C140F] via-[#2A1E18] to-[#120D0A] border border-amber-500/25 shadow-2xl p-6 sm:p-12 my-6 text-amber-50 group selection:bg-amber-500/30">
      {/* Background Ambient Gold Light Blur */}
      <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-amber-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Twinkling Starry Night Backdrop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-85">
        <div className="absolute top-6 left-12 w-2 h-2 rounded-full bg-amber-300 animate-twinkle-fast" />
        <div className="absolute top-14 left-1/3 w-2.5 h-2.5 rounded-full bg-amber-200 animate-twinkle-slow" />
        <div className="absolute top-8 right-1/3 w-2 h-2 rounded-full bg-amber-400 animate-twinkle-fast" />
        <div className="absolute top-20 right-16 w-3 h-3 rounded-full bg-amber-300 animate-twinkle-slow" />
        <div className="absolute bottom-16 left-1/4 w-2 h-2 rounded-full bg-amber-200 animate-twinkle-fast" />
        <div className="absolute top-1/2 left-8 w-1.5 h-1.5 rounded-full bg-amber-300 animate-twinkle-slow" />
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

        {/* Right Column: Animated Rahnamo (Guide), Camel & Shining North Star Emblem */}
        <div className="lg:col-span-5 flex items-center justify-center relative">
          <div className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-full p-2 bg-gradient-to-b from-amber-400/40 via-amber-600/20 to-amber-950/80 border-2 border-amber-400/40 shadow-2xl group-hover:scale-105 transition-transform duration-700">
            {/* Outer Radial Ray Flare */}
            <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-ray-pulse pointer-events-none" />

            {/* Inner Dark Desert Canvas */}
            <div className="w-full h-full rounded-full overflow-hidden border border-amber-400/60 shadow-inner bg-gradient-to-b from-[#140E0A] via-[#211710] to-[#120C08] flex items-center justify-center relative p-4">
              
              {/* 🌟 1. Animated Shining North Guide Star */}
              <div className="absolute top-6 z-20 flex flex-col items-center">
                <div className="relative animate-guide-star">
                  {/* Outer Glow Halo */}
                  <div className="absolute -inset-3 bg-amber-400/30 rounded-full blur-md animate-pulse" />
                  
                  {/* 8-Point Guide Star SVG */}
                  <svg viewBox="0 0 100 100" className="w-14 h-14 text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]" fill="currentColor">
                    <path d="M50 0 L58 38 L96 46 L58 54 L50 92 L42 54 L4 46 L42 38 Z" fill="url(#starGoldGrad)" />
                    <path d="M50 15 L55 40 L80 46 L55 52 L50 77 L45 52 L20 46 L45 40 Z" fill="#FFF7ED" />
                    <defs>
                      <linearGradient id="starGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FDE68A" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#D97706" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* ✨ 2. Twinkling Sky Background Stars inside Emblem */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <span className="absolute top-10 left-10 w-1.5 h-1.5 bg-amber-200 rounded-full animate-twinkle-fast" />
                <span className="absolute top-16 left-24 w-2 h-2 bg-amber-300 rounded-full animate-twinkle-slow" />
                <span className="absolute top-12 right-12 w-2 h-2 bg-amber-200 rounded-full animate-twinkle-fast" />
                <span className="absolute top-24 right-20 w-1.5 h-1.5 bg-amber-300 rounded-full animate-twinkle-slow" />
                <span className="absolute top-32 left-14 w-2 h-2 bg-amber-400 rounded-full animate-twinkle-fast" />
              </div>

              {/* 🐪 3. Animated Rahnamo (Man) & Camel Walking Motion across Sand Dunes */}
              <div className="absolute bottom-6 w-full flex flex-col items-center justify-end z-20">
                
                {/* Walking Man & Camel Group */}
                <div className="relative flex items-end justify-center gap-2 mb-1 animate-caravan">
                  
                  {/* 🚶 RAHNAMO (MAN IN ROBES LEADING) */}
                  <div className="animate-man-walk flex flex-col items-center z-10">
                    <svg viewBox="0 0 60 100" className="w-9 h-14 sm:w-11 sm:h-16 text-amber-200 drop-shadow-[0_2px_8px_rgba(217,119,6,0.6)]" fill="currentColor">
                      {/* Head Turban / Keffiyeh */}
                      <path d="M26 12 C24 6 36 6 34 12 C34 16 26 16 26 12 Z" fill="#FDE68A" />
                      {/* Body Robe */}
                      <path d="M22 20 C18 30 16 55 14 78 C24 82 36 82 46 78 C44 55 42 30 38 20 Z" fill="#F59E0B" />
                      {/* Walking Staff / Lead Rope */}
                      <path d="M12 25 L8 80" stroke="#FDE68A" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* 🔗 LEASH CONNECTOR */}
                  <svg className="w-10 h-6 text-amber-400/80 -mx-3 mb-4" viewBox="0 0 50 30" fill="none">
                    <path d="M5 10 Q25 28 45 12" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 2" />
                  </svg>

                  {/* 🐪 GOLDEN CAMEL WALKING BEHIND */}
                  <div className="animate-camel-bob flex flex-col items-center">
                    <svg viewBox="0 0 120 100" className="w-24 h-20 sm:w-32 sm:h-24 text-amber-400 drop-shadow-[0_4px_12px_rgba(217,119,6,0.7)]" fill="currentColor">
                      {/* Camel Head & Neck */}
                      <path d="M15 22 C12 18 20 12 26 16 C30 20 28 32 32 40" stroke="#FBBF24" strokeWidth="6" strokeLinecap="round" fill="none" />
                      {/* Camel Hump 1 */}
                      <path d="M30 40 C35 20 52 20 58 40" fill="#F59E0B" />
                      {/* Camel Hump 2 */}
                      <path d="M56 40 C62 22 78 22 84 42" fill="#D97706" />
                      {/* Camel Body & Legs */}
                      <path d="M28 42 L88 44 C96 50 96 62 86 64 L30 62 Z" fill="#F59E0B" />
                      {/* Legs Front & Back */}
                      <path d="M34 62 L32 92 M42 62 L44 90 M76 62 L74 92 M84 62 L86 90" stroke="#D97706" strokeWidth="4" strokeLinecap="round" />
                      {/* Tail */}
                      <path d="M88 48 Q98 56 94 68" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* 🌊 Golden Sand Dune Curve */}
                <svg className="w-full h-12 text-amber-600/60" viewBox="0 0 300 40" preserveAspectRatio="none">
                  <path d="M0 25 Q75 5 150 25 Q225 45 300 20 L300 40 L0 40 Z" fill="url(#duneGrad)" />
                  <defs>
                    <linearGradient id="duneGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#D97706" />
                      <stop offset="50%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#B45309" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
