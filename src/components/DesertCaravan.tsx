'use client';

import { Compass, Star, ShieldCheck, Users } from 'lucide-react';

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C140F] via-[#2A1E18] to-[#120D0A] border border-amber-500/25 shadow-2xl p-6 sm:p-12 my-6 text-amber-50 group selection:bg-amber-500/30">
      
      {/* Background Ambient Gold Light Blur */}
      <div className="absolute top-1/4 right-1/4 -translate-y-1/2 w-96 h-96 bg-amber-500/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-amber-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Twinkling Starry Night Backdrop Across Entire Width */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-80">
        <div className="absolute top-6 left-12 w-2 h-2 rounded-full bg-amber-300 animate-twinkle-fast" />
        <div className="absolute top-16 left-1/4 w-2.5 h-2.5 rounded-full bg-amber-200 animate-twinkle-slow" />
        <div className="absolute top-8 left-1/2 w-2 h-2 rounded-full bg-amber-400 animate-twinkle-fast" />
        <div className="absolute top-12 right-1/3 w-3 h-3 rounded-full bg-amber-300 animate-twinkle-slow" />
        <div className="absolute top-20 right-16 w-2 h-2 rounded-full bg-amber-200 animate-twinkle-fast" />
        <div className="absolute top-28 left-16 w-1.5 h-1.5 rounded-full bg-amber-300 animate-twinkle-slow" />
        <div className="absolute top-36 right-1/4 w-2.5 h-2.5 rounded-full bg-amber-400 animate-twinkle-fast" />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Hero Copy & Value Propositions */}
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

        {/* Right Column: Clean 3D Metallic Guide Star, Man & Camel Animations */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between relative min-h-[340px] pt-4">
          
          {/* 🌟 1. Clean 3D Metallic North Guide Star */}
          <div className="relative animate-guide-star z-20 mb-2">
            <div className="absolute -inset-4 bg-amber-400/30 rounded-full blur-xl animate-pulse pointer-events-none" />
            <img
              src="/gold-star-3d.png"
              alt="3D Metallic Golden Guide Star"
              className="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-[0_0_20px_rgba(251,191,36,0.9)]"
            />
          </div>

          {/* 🌊 2. Clean 3D Walking Caravan & Sand Dune Base */}
          <div className="w-full relative flex flex-col items-center justify-end z-20 mt-auto">
            
            {/* 🚶 🐫 Walking 3D Man & Camel */}
            <div className="relative flex items-end justify-center gap-2 animate-caravan z-20 -mb-2">
              
              {/* 3D Metallic Man in Robes */}
              <div className="animate-man-walk flex flex-col items-center">
                <img
                  src="/gold-man-3d.png"
                  alt="3D Metallic Rahnamo Guide"
                  className="h-16 sm:h-20 w-auto object-contain drop-shadow-[0_4px_10px_rgba(217,119,6,0.8)]"
                />
              </div>

              {/* Dynamic Leash Connector */}
              <svg className="w-10 h-5 text-amber-400/80 -mx-3 mb-3 z-10" viewBox="0 0 50 30" fill="none">
                <path d="M5 10 Q25 28 45 12" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
              </svg>

              {/* 3D Metallic Low-Poly Golden Camel */}
              <div className="animate-camel-bob flex flex-col items-center">
                <img
                  src="/gold-camel-3d.png"
                  alt="3D Metallic Golden Camel"
                  className="h-20 sm:h-26 w-auto object-contain drop-shadow-[0_6px_14px_rgba(217,119,6,0.9)]"
                />
              </div>
            </div>

            {/* Clean 3D Metallic Sand Dune Curve Base */}
            <div className="w-full relative z-10 flex justify-center">
              <img
                src="/gold-dune-3d.png"
                alt="3D Metallic Sand Dune Curve"
                className="w-full max-w-sm sm:max-w-md h-auto object-contain drop-shadow-md"
              />
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
