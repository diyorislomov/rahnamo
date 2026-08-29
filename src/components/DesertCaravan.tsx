'use client';

import { Compass, Star, ShieldCheck, Users } from 'lucide-react';

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C140F] via-[#2A1E18] to-[#120D0A] border border-amber-500/25 shadow-2xl p-6 sm:p-12 my-6 text-amber-50 group selection:bg-amber-500/30">
      {/* Background Ambient Gold Light Glow */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-amber-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Twinkling Desert Night Stars Overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-80">
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

        {/* Right Column: Real 3D Metallic Golden Emblem Artwork with Glowing Star Flare */}
        <div className="lg:col-span-5 flex items-center justify-center relative">
          <div className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-full p-2 bg-gradient-to-b from-amber-400/40 via-amber-600/20 to-amber-950/80 border-2 border-amber-400/40 shadow-2xl group-hover:scale-105 transition-all duration-700">
            
            {/* Outer Radial Light Ray Ring */}
            <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-ray-pulse pointer-events-none" />

            {/* Glowing Star Flare Overlay over the top Guide Star */}
            <div className="absolute top-10 sm:top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="relative animate-guide-star">
                <div className="w-12 h-12 bg-amber-300/40 rounded-full blur-md animate-pulse" />
              </div>
            </div>

            {/* Crisp 3D Metallic Artwork Image */}
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-amber-400/60 shadow-inner bg-[#140E0A] flex items-center justify-center relative">
              <img
                src="/hero-guide-star.jpg"
                alt="Rahnamo — 3D Metallic Golden Guide Star Emblem"
                className="w-full h-full object-cover rounded-full transform scale-105 group-hover:scale-110 transition-transform duration-700"
              />

              {/* Subtle Gold Shimmer Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C140F]/50 via-transparent to-amber-300/15 pointer-events-none rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
