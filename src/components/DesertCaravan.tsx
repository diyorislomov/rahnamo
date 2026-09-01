'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Compass, Star, ShieldCheck, Users } from 'lucide-react';
import { CamelIcon } from '@/components/Icons';

// 5. Lazy-load Three.js 3D Star Scene with ssr: false for high performance & clean SSR
const ThreeStarScene = dynamic(() => import('@/components/ThreeStarScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[260px] sm:min-h-[320px] flex items-center justify-center">
      <div className="w-16 h-16 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
    </div>
  ),
});

export default function DesertCaravan() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#FFFDF9] via-[#FAF1DF] to-[#F3E2C4] border border-amber-900/15 shadow-lg p-6 sm:p-12 my-6 select-none group">
      
      {/* ☀️ Radiant Silk Road Desert Sun Glow */}
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

        {/* Right Column: 3D Three.js Assembling Star Hero Moment + Walking Caravan */}
        <div className="lg:col-span-5 relative h-64 sm:h-80 w-full flex flex-col items-center justify-center">
          
          {/* 🌟 3D Three.js Glowing Star Particle Assembly Hero Feature */}
          <div className="w-full h-48 sm:h-60 relative z-10">
            <ThreeStarScene />
          </div>

          {/* 🐪 Animated Walking Caravan Silhouette beneath the 3D Star */}
          <div className="absolute bottom-2 left-2 sm:left-6 flex items-end gap-1 sm:gap-4 animate-caravan z-20">
            
            {/* 🚶 Guide */}
            <div className="flex flex-col items-center animate-man-walk z-20">
              <svg viewBox="0 0 60 100" className="w-8 h-13 sm:w-11 sm:h-18 text-amber-950 fill-current drop-shadow-md overflow-visible">
                <g className="animate-human-leg-back" style={{ transformOrigin: '28px 68px' }}>
                  <path d="M26 68 L20 94" stroke="#1C1612" strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M20 94 L15 95" stroke="#1C1612" strokeWidth="4" strokeLinecap="round" />
                </g>
                <g className="animate-human-leg-front" style={{ transformOrigin: '34px 68px' }}>
                  <path d="M32 68 L38 94" stroke="#2C241E" strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M38 94 L44 95" stroke="#2C241E" strokeWidth="4" strokeLinecap="round" />
                </g>
                <path d="M22 22 C18 34 16 52 14 70 C26 74 36 74 48 70 C44 52 42 34 38 22 Z" fill="#2C241E" />
                <path d="M26 12 C24 6 36 6 34 12 C34 16 26 16 26 12 Z" fill="#9C4221" />
                <path d="M25 15 H35 V22 H25 Z" fill="#D97706" />
                <g className="animate-human-staff" style={{ transformOrigin: '22px 28px' }}>
                  <path d="M14 26 L8 88" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
                </g>
              </svg>
            </div>

            {/* 🔗 Rope */}
            <div className="relative z-10 -mx-2 mb-6">
              <svg className="w-9 h-6 text-amber-800 drop-shadow-xs" viewBox="0 0 50 30" fill="none">
                <path d="M2 12 Q24 28 48 2" stroke="#D97706" strokeWidth="2.5" strokeDasharray="4 3" strokeLinecap="round" />
              </svg>
            </div>

            {/* 🐪 Lead Camel */}
            <div className="flex flex-col items-center animate-camel-bob z-20">
              <svg viewBox="0 0 120 100" className="w-20 h-16 sm:w-26 sm:h-22 text-amber-950 fill-current drop-shadow-md overflow-visible">
                <g className="animate-leg-pair-b" style={{ transformOrigin: '55px 60px', animationDelay: '0.45s' }}>
                  <path d="M40 60 L44 92" stroke="#1C1612" strokeWidth="4" strokeLinecap="round" />
                  <path d="M82 60 L86 92" stroke="#1C1612" strokeWidth="4" strokeLinecap="round" />
                </g>
                <g className="animate-leg-pair-a" style={{ transformOrigin: '55px 60px' }}>
                  <path d="M32 60 L28 92" stroke="#2C241E" strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M74 60 L70 92" stroke="#2C241E" strokeWidth="4.5" strokeLinecap="round" />
                </g>
                <path d="M14 20 C10 16 18 10 24 14 C28 18 26 32 30 40" stroke="#2C241E" strokeWidth="6" strokeLinecap="round" fill="none" />
                <path d="M30 40 C35 20 52 20 58 40 C64 22 80 22 86 42 L28 42 Z" fill="#2C241E" />
                <path d="M42 42 H72 V58 H42 Z" fill="#9C4221" />
                <path d="M26 42 L88 44 C96 50 96 62 86 64 L28 62 Z" fill="#2C241E" />
              </svg>
            </div>

            {/* 🐫 Follower Camel */}
            <div className="flex flex-col items-center animate-camel-bob [animation-delay:0.4s]">
              <svg viewBox="0 0 120 100" className="w-16 h-13 sm:w-22 sm:h-18 text-amber-900 fill-current opacity-90 drop-shadow-sm overflow-visible">
                <g className="animate-leg-pair-b" style={{ transformOrigin: '55px 60px', animationDelay: '0.75s' }}>
                  <path d="M40 60 L44 92" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
                  <path d="M82 60 L86 92" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
                </g>
                <g className="animate-leg-pair-a" style={{ transformOrigin: '55px 60px', animationDelay: '0.3s' }}>
                  <path d="M32 60 L28 92" stroke="#9C4221" strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M74 60 L70 92" stroke="#9C4221" strokeWidth="4.5" strokeLinecap="round" />
                </g>
                <path d="M15 22 C12 18 20 12 26 16 C30 20 28 32 32 40" stroke="#9C4221" strokeWidth="6" strokeLinecap="round" fill="none" />
                <path d="M30 40 C35 20 52 20 58 40 C64 22 80 22 86 42 L28 42 Z" fill="#9C4221" />
                <path d="M26 42 L88 44 C96 50 96 62 86 64 L28 62 Z" fill="#9C4221" />
              </svg>
            </div>

          </div>

        </div>

      </div>

      {/* 🌊 3-Layer Parallax Desert Sand Dunes Base */}
      <div className="relative mt-4 h-20 sm:h-28 w-full -mb-6 -mx-6 sm:-mx-12">
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
