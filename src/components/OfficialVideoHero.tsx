'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowRight, ArrowDown, Volume2, VolumeX, Play, Pause, Sparkles, ShieldCheck, Star } from 'lucide-react';
import { Counselor } from '@/types';

interface OfficialVideoHeroProps {
  counselors?: Counselor[];
}

export default function OfficialVideoHero({ counselors = [] }: OfficialVideoHeroProps) {
  const t = useTranslations('hero');
  const tCommon = useTranslations('common');
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <section className="relative w-full h-[88vh] min-h-[600px] max-h-[850px] overflow-hidden bg-[#0d0a06] text-amber-50 select-none">
      
      {/* 🎬 OFFICIAL BACKGROUND VIDEO LAYER */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src="/rahnamo.webm"
          autoPlay
          loop
          muted={isMuted}
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Fallback loading placeholder background */}
        {!videoLoaded && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1C1612] via-[#451A03] to-[#0A0704] animate-pulse" />
        )}

        {/* CINEMATIC VIGNETTE OVERLAY FOR HIGH CONTRAST TEXT LEGIBILITY */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0a06]/40 via-[#0d0a06]/55 to-[#0d0a06]/95 z-1" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0d0a06]/40 to-[#0d0a06]/85 z-1" />
      </div>

      {/* 📜 CONTENT & HERO CTAs LAYER */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-between py-8 sm:py-12">
        
        {/* Top Header Badge & Video Controls */}
        <div className="flex justify-between items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs font-bold backdrop-blur-md shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Buyuk Ipak Yo'li karyera konsultatsiyasi va 1-ga-1 mentorlik</span>
          </div>

          {/* Interactive Video Controls (Sound / Pause / Play) */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-amber-100 text-xs font-bold transition-all cursor-pointer backdrop-blur-md"
              title={isPlaying ? 'Pauza' : 'Ijro etish'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleMute}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-amber-100 text-xs font-bold transition-all cursor-pointer backdrop-blur-md flex items-center gap-1.5"
              title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-amber-300" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
              <span className="text-[10px] hidden sm:inline">{isMuted ? "Ovoz" : "Yoqilgan"}</span>
            </button>
          </div>
        </div>

        {/* Center Hero Value Proposition Copy */}
        <div className="max-w-3xl my-auto space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <h1 className="font-serif font-black text-3xl sm:text-5xl lg:text-6xl text-amber-50 leading-[1.12] tracking-tight drop-shadow-xl">
              Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
            </h1>

            <p className="text-xs sm:text-base text-amber-100/90 max-w-2xl leading-relaxed font-sans drop-shadow-md">
              Har bir talaba bir yo'lboshchiga loyiq. Tibbiyot, Huquq, Arxitektura, Dasturlash va Grantlar bo'yicha dunyo darajasidagi ekspertlardan 1-ga-1 shaxsiy mentorlik oling.
            </p>
          </motion.div>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="pt-3 flex flex-wrap items-center gap-3"
          >
            <a
              href="#rahnamolar"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-amber-950 font-serif font-extrabold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-xl transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <span>Sessiya vaqtini tanlash</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-amber-50 font-bold text-xs sm:text-sm px-5 py-3.5 rounded-2xl backdrop-blur-md transition-all"
            >
              <span>Qanday ishlaydi?</span>
              <ArrowDown className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Trust Value Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="pt-4 flex flex-wrap items-center gap-4 text-xs text-amber-200/90 font-medium"
          >
            <div className="flex items-center gap-1.5 bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-500/20 backdrop-blur-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>100% Tasdiqlangan Mentorlar</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-500/20 backdrop-blur-xs">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>4.9 ★ Talabalar Bahosi</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Tagline & Subtitles Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-t border-white/15 pt-4 text-[11px] text-amber-200/70 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Rasmiy Video: Yo'lingizni Yoritamiz</span>
          </div>
          <div>Buyuk Ipak Yo'li • 1-ga-1 Mentorlik</div>
        </div>

      </div>
    </section>
  );
}
