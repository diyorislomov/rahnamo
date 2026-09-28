'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, RotateCcw, ArrowRight } from 'lucide-react';
import { Counselor } from '@/types';

interface MotionHeroProps {
  counselors?: Counselor[];
}

export default function CinematicDesertMotionHero({ counselors = [] }: MotionHeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const [animationPhase, setAnimationPhase] = useState<'dusk' | 'night' | 'star_burst'>('dusk');
  const [isPlaying, setIsPlaying] = useState(true);
  const [key, setKey] = useState(0);

  // 8-10 second Motion Cycle Logic:
  // 0s - 3s: Dusk (amber-violet gradient)
  // 3s - 6s: Night transition (deep indigo sky & emerging stars)
  // 6s - 9s: Guiding Star Beat (one star swells dramatically into bright golden beacon)
  useEffect(() => {
    if (!isPlaying || shouldReduceMotion) return;

    setAnimationPhase('dusk');

    const nightTimer = setTimeout(() => {
      setAnimationPhase('night');
    }, 3000);

    const starTimer = setTimeout(() => {
      setAnimationPhase('star_burst');
    }, 6000);

    return () => {
      clearTimeout(nightTimer);
      clearTimeout(starTimer);
    };
  }, [isPlaying, key, shouldReduceMotion]);

  const handleReplay = () => {
    setKey((prev) => prev + 1);
    setIsPlaying(true);
  };

  return (
    <div key={key} className="relative w-full h-[85vh] min-h-[580px] max-h-[820px] overflow-hidden bg-[#0a0704] text-amber-50 select-none">
      
      {/* 🌇 1. DUSK-TO-NIGHT SKY GRADIENT LAYER */}
      <motion.div
        className="absolute inset-0 z-0 transition-colors duration-1000"
        animate={{
          background:
            animationPhase === 'dusk'
              ? 'radial-gradient(ellipse at 50% 80%, #9C4221 0%, #451A03 40%, #1A0C03 85%, #0A0704 100%)'
              : animationPhase === 'night'
              ? 'radial-gradient(ellipse at 50% 60%, #1E1B4B 0%, #0F172A 45%, #090D16 85%, #05070B 100%)'
              : 'radial-gradient(ellipse at 50% 30%, #2E1065 0%, #1E1B4B 35%, #0F172A 70%, #05070B 100%)',
        }}
        transition={{ duration: 2.8, ease: 'easeInOut' }}
      />

      {/* 🌌 2. REALISTIC STARRY SKY & VOLUMETRIC ATMOSPHERE */}
      <div className="absolute inset-0 z-1 pointer-events-none">
        {/* Distant Static Stars */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              'radial-gradient(2px 2px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(2px 2px at 40px 70px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 90px 40px, #ffffff, rgba(0,0,0,0)), radial-gradient(2px 2px at 160px 120px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 230px 80px, #ffffff, rgba(0,0,0,0)), radial-gradient(2px 2px at 310px 150px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 420px 60px, #ffffff, rgba(0,0,0,0)), radial-gradient(2px 2px at 550px 110px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 680px 70px, #ffffff, rgba(0,0,0,0)), radial-gradient(2px 2px at 800px 130px, #ffffff, rgba(0,0,0,0))',
            backgroundSize: '550px 350px',
          }}
        />

        {/* 🌟 3. THE SINGLE MOST IMPORTANT BEAT: EXPANDING GOLDEN GUIDING STAR */}
        <motion.div
          className="absolute top-[18%] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none"
          animate={{
            scale: animationPhase === 'star_burst' ? [1, 1.45, 1.25] : 0.8,
            opacity: animationPhase === 'star_burst' ? 1 : 0.35,
          }}
          transition={{ duration: 2.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Outer Volumetric Halo */}
          <motion.div
            className="w-36 h-36 sm:w-56 sm:h-56 rounded-full bg-gradient-to-r from-amber-400/40 via-amber-500/20 to-transparent blur-2xl"
            animate={{
              scale: animationPhase === 'star_burst' ? [1, 1.6, 1.35] : 0.7,
              opacity: animationPhase === 'star_burst' ? 0.95 : 0.2,
            }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          />

          {/* Core 4-Point Radiant Star Icon */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            animate={{
              rotate: animationPhase === 'star_burst' ? [0, 90, 180] : 0,
            }}
            transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
          >
            <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-28 sm:h-28 text-amber-300 drop-shadow-[0_0_35px_rgba(245,158,11,1)]">
              <path d="M50 0 L58 42 L100 50 L58 58 L50 100 L42 58 L0 50 L42 42 Z" fill="currentColor" />
              <path d="M50 15 L55 45 L85 50 L55 55 L50 85 L45 55 L15 50 L45 45 Z" fill="#FFFBEB" />
            </svg>
          </motion.div>

          {/* Golden Volumetric Light Beam shining down on the traveler */}
          {animationPhase === 'star_burst' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 0.45, height: '380px' }}
              transition={{ duration: 1.5, delay: 0.3 }}
              className="w-48 sm:w-80 bg-gradient-to-b from-amber-300/40 via-amber-500/10 to-transparent blur-xl pointer-events-none mt-4"
              style={{ clipPath: 'polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)' }}
            />
          )}
        </motion.div>

        {/* 💨 Volumetric Swirling Sand & Dust Particles */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0a0704] via-amber-950/20 to-transparent mix-blend-screen opacity-70" />
      </div>

      {/* 🐪 4. CINEMATIC SAND DUNE RIDGE & CARAVAN SILHOUETTE */}
      <div className="absolute inset-x-0 bottom-0 h-[48%] z-10 pointer-events-none">
        
        {/* Dune 1 (Background Dune) */}
        <svg className="absolute bottom-0 left-0 w-full h-full text-amber-950/40" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path fill="currentColor" d="M0,50 Q350,110 700,35 Q1000,5 1200,60 L1200,120 L0,120 Z" />
        </svg>

        {/* Dune 2 (Main Curved Dune Ridge) */}
        <svg className="absolute bottom-0 left-0 w-full h-full text-[#140e09]" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path fill="currentColor" d="M0,75 Q400,25 850,95 Q1050,45 1200,85 L1200,120 L0,120 Z" />
        </svg>

        {/* 🚶🐪 5. ANIMATED CARAVAN MOVEMENT ALONG THE DUNE RIDGE */}
        <motion.div
          className="absolute bottom-[22%] left-0 z-20 flex items-end gap-3 sm:gap-6 pl-6 sm:pl-16"
          initial={{ x: '-15%', scale: 0.85 }}
          animate={{ x: '45%', scale: 1.05 }}
          transition={{ duration: 10, ease: 'easeInOut' }}
        >
          {/* Central Asian Guide (Chapan coat & Doppi cap) */}
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 60 100" className="w-10 h-16 sm:w-14 sm:h-22 text-amber-100 fill-current drop-shadow-lg">
              {/* Head / Doppi Cap */}
              <path d="M24 10 C22 4 38 4 36 10 C36 14 24 14 24 10 Z" fill="#9C4221" />
              <path d="M22 13 H38 V18 H22 Z" fill="#F59E0B" />
              {/* Chapan Coat Body */}
              <path d="M18 20 C14 34 12 56 10 74 C26 78 36 78 50 74 C46 56 44 34 40 20 Z" fill="#1C1612" stroke="#B45309" strokeWidth="1.5" />
              {/* Lead Rope Hand */}
              <path d="M14 26 L4 35" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Lead Rope */}
          <div className="-mx-2 mb-8">
            <svg className="w-12 h-6 text-amber-500" viewBox="0 0 50 30" fill="none">
              <path d="M2 10 Q25 28 48 4" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 2" />
            </svg>
          </div>

          {/* Lead Camel */}
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 120 100" className="w-24 h-20 sm:w-32 sm:h-26 text-amber-950 fill-current drop-shadow-xl">
              <path d="M14 20 C10 16 18 10 24 14 C28 18 26 32 30 40" stroke="#2C241E" strokeWidth="6" strokeLinecap="round" fill="none" />
              <path d="M30 40 C35 20 52 20 58 40 C64 22 80 22 86 42 L28 42 Z" fill="#2C241E" />
              <path d="M26 42 L88 44 C96 50 96 62 86 64 L28 62 Z" fill="#2C241E" />
            </svg>
          </div>

          {/* 2nd Camel */}
          <div className="flex flex-col items-center opacity-90">
            <svg viewBox="0 0 120 100" className="w-20 h-16 sm:w-28 sm:h-22 text-amber-900 fill-current">
              <path d="M30 40 C35 20 52 20 58 40 C64 22 80 22 86 42 L28 42 Z" fill="#78350F" />
              <path d="M26 42 L88 44 C96 50 96 62 86 64 L28 62 Z" fill="#78350F" />
            </svg>
          </div>

          {/* 3rd Camel */}
          <div className="flex flex-col items-center opacity-80">
            <svg viewBox="0 0 120 100" className="w-16 h-13 sm:w-24 sm:h-18 text-amber-950 fill-current">
              <path d="M30 40 C35 20 52 20 58 40 C64 22 80 22 86 42 L28 42 Z" fill="#451A03" />
            </svg>
          </div>
        </motion.div>
      </div>

      {/* 📜 6. OVERLAY CONTENT & CTAs */}
      <div className="relative z-30 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 h-full flex flex-col justify-between py-10">
        
        {/* Header Controls */}
        <div className="flex justify-between items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs font-bold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Ipak Yo'lining Rahnamo Yulduzi</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReplay}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-amber-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Qayta ko'rish"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Qayta ijro</span>
            </button>
          </div>
        </div>

        {/* Center Hero Copy */}
        <div className="max-w-3xl space-y-4 my-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="font-serif font-black text-3xl sm:text-5xl lg:text-6xl text-amber-50 leading-tight tracking-tight drop-shadow-md"
          >
            Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-xs sm:text-base text-amber-100/80 max-w-xl leading-relaxed font-sans"
          >
            Tibbiyot, Huquq, Arxitektura, Dasturlash va Grantlar bo'yicha dunyo darajasidagi ekspertlardan 1-ga-1 shaxsiy mentorlik oling.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="pt-2 flex flex-wrap items-center gap-3"
          >
            <a
              href="#rahnamolar"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-serif font-extrabold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-xl transition-all cursor-pointer"
            >
              <span>Sessiya vaqtini tanlash</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-amber-100 font-bold text-xs sm:text-sm px-5 py-3.5 rounded-2xl backdrop-blur-md transition-all"
            >
              <span>Qanday ishlaydi?</span>
            </a>
          </motion.div>
        </div>

        {/* Bottom Status Bar */}
        <div className="flex justify-between items-end border-t border-white/10 pt-4 text-[11px] text-amber-200/70 font-mono">
          <div>Status: {animationPhase === 'star_burst' ? '🌟 Bright Guiding Star Active' : '🌌 Night Transition'}</div>
          <div>1-on-1 Mentorlik • Silk Road</div>
        </div>

      </div>
    </div>
  );
}
