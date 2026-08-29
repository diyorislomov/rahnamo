'use client';

import React from 'react';
import { Compass, Star, ShieldCheck, Users, Sun } from 'lucide-react';

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#FFFDF9] via-[#FAF1DF] to-[#F3E2C4] border border-amber-900/15 shadow-lg p-6 sm:p-12 my-6 select-none group">
      
      {/* ☀️ Radiant Silk Road Desert Sun */}
      <div className="absolute top-4 right-8 w-28 h-28 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600/40 opacity-80 blur-xs animate-pulse pointer-events-none" />

      {/* ✨ Ambient Desert Sun Rays & Twinkling Sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-6 left-12 w-1.5 h-1.5 rounded-full bg-amber-600 animate-twinkle-fast" />
        <div className="absolute top-10 left-1/3 w-2 h-2 rounded-full bg-amber-700 animate-twinkle-slow" />
        <div className="absolute top-4 right-1/4 w-1.5 h-1.5 rounded-full bg-amber-500 animate-twinkle-fast" />
        <div className="absolute top-14 right-12 w-2 h-2 rounded-full bg-amber-600 animate-twinkle-slow" />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Hero Title, Subtitle & Value Chips */}
        <div className="lg:col-span-7 space-y-5 text-left">
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

        {/* Right Column: High-Craft Vector Animation (Rahnamo Human Guide Leading Camel Caravan) */}
        <div className="lg:col-span-5 relative h-56 sm:h-72 w-full flex items-end justify-center">
          
          {/* Animated Walking Caravan Group (Man + Lead Camel + Follower Camels) */}
          <div className="absolute bottom-4 left-4 sm:left-12 flex items-end gap-3 sm:gap-5 animate-caravan z-20">
            
            {/* 🚶 1. RAHNAMO (HUMAN GUIDE IN TRADITIONAL ROBES LEADING) */}
            <div className="flex flex-col items-center animate-man-walk z-20">
              <svg viewBox="0 0 60 100" className="w-10 h-16 sm:w-13 sm:h-22 text-amber-950 fill-current drop-shadow-md" fill="currentColor">
                {/* Turban / Keffiyeh Headwear */}
                <path d="M26 12 C24 6 36 6 34 12 C34 16 26 16 26 12 Z" fill="#9C4221" />
                {/* Face & Robe Collar */}
                <path d="M25 15 H35 V22 H25 Z" fill="#D97706" />
                {/* Flowing Traditional Robe */}
                <path d="M22 22 C18 34 16 60 14 84 C26 88 36 88 48 84 C44 60 42 34 38 22 Z" fill="#2C241E" />
                {/* Robe Fold Details */}
                <path d="M28 22 L24 85 M34 22 L36 85" stroke="#9C4221" strokeWidth="1.5" />
                {/* Walking Staff */}
                <path d="M12 25 L8 86" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="w-2.5 h-0.5 bg-amber-950/40 rounded-full mt-0.5" />
            </div>

            {/* 🔗 2. GUIDING ROPE CONNECTOR */}
            <svg className="w-10 h-6 text-amber-900/80 -mx-3 mb-4 z-10" viewBox="0 0 50 30" fill="none">
              <path d="M5 10 Q25 28 45 12" stroke="currentColor" strokeWidth="2.2" strokeDasharray="3 2" />
            </svg>

            {/* 🐪 3. LEAD SILK ROAD CAMEL */}
            <div className="flex flex-col items-center animate-camel-bob z-20">
              <svg viewBox="0 0 120 100" className="w-24 h-20 sm:w-32 sm:h-26 text-amber-950 fill-current drop-shadow-md">
                {/* Head & Neck */}
                <path d="M15 22 C12 18 20 12 26 16 C30 20 28 32 32 40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
                {/* Double Humps */}
                <path d="M30 40 C35 20 52 20 58 40 C64 22 80 22 86 42 L28 42 Z" fill="#2C241E" />
                {/* Decorative Silk Saddle Blanket */}
                <path d="M42 42 H72 V58 H42 Z" fill="#9C4221" />
                <path d="M46 44 H68 V56 H46 Z" fill="#D97706" />
                {/* Body & Legs */}
                <path d="M26 42 L88 44 C96 50 96 62 86 64 L28 62 Z" fill="#2C241E" />
                <path d="M34 62 L32 92 M42 62 L44 90 M76 62 L74 92 M84 62 L86 90" stroke="#2C241E" strokeWidth="4.5" strokeLinecap="round" />
                {/* Tail */}
                <path d="M88 48 Q98 56 94 68" stroke="#9C4221" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
              <span className="w-3 h-0.5 bg-amber-950/40 rounded-full mt-0.5" />
            </div>

            {/* 🐫 4. FOLLOWER CAMEL 2 */}
            <div className="flex flex-col items-center animate-camel-bob [animation-delay:0.4s]">
              <svg viewBox="0 0 120 100" className="w-20 h-16 sm:w-26 sm:h-22 text-amber-900 fill-current opacity-90 drop-shadow-sm">
                <path d="M15 22 C12 18 20 12 26 16 C30 20 28 32 32 40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
                <path d="M30 40 C35 20 52 20 58 40 C64 22 80 22 86 42 L28 42 Z" fill="#9C4221" />
                <path d="M26 42 L88 44 C96 50 96 62 86 64 L28 62 Z" fill="#9C4221" />
                <path d="M34 62 L32 92 M42 62 L44 90 M76 62 L74 92 M84 62 L86 90" stroke="#9C4221" strokeWidth="4.5" strokeLinecap="round" />
              </svg>
              <span className="w-2.5 h-0.5 bg-amber-950/30 rounded-full mt-0.5" />
            </div>

            {/* 🐫 5. FOLLOWER CAMEL 3 */}
            <div className="flex flex-col items-center animate-camel-bob [animation-delay:0.8s]">
              <svg viewBox="0 0 120 100" className="w-16 h-14 sm:w-20 sm:h-18 text-amber-800 fill-current opacity-80 drop-shadow-xs">
                <path d="M15 22 C12 18 20 12 26 16 C30 20 28 32 32 40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
                <path d="M30 40 C35 20 52 20 58 40 C64 22 80 22 86 42 L28 42 Z" fill="#D97706" />
                <path d="M26 42 L88 44 C96 50 96 62 86 64 L28 62 Z" fill="#D97706" />
                <path d="M34 62 L32 92 M42 62 L44 90 M76 62 L74 92 M84 62 L86 90" stroke="#D97706" strokeWidth="4.5" strokeLinecap="round" />
              </svg>
              <span className="w-2 h-0.5 bg-amber-950/20 rounded-full mt-0.5" />
            </div>

          </div>

        </div>

      </div>

      {/* 🌊 3-Layer Parallax Desert Sand Dunes Base */}
      <div className="relative mt-4 h-20 sm:h-28 w-full -mb-6 -mx-6 sm:-mx-12">
        {/* Dune Layer 1 (Far - Terracotta Light) */}
        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-200/60"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,40 Q300,120 600,30 Q900,-20 1200,50 L1200,120 L0,120 Z" />
        </svg>

        {/* Dune Layer 2 (Mid - Golden Ochre) */}
        <svg
          className="absolute bottom-0 left-0 w-full h-full text-amber-300/50"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,70 Q400,20 800,90 Q1050,40 1200,80 L1200,120 L0,120 Z" />
        </svg>

        {/* Dune Layer 3 (Foreground - Warm Dune Accent) */}
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
