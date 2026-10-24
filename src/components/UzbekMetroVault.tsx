'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  Sparkles,
  ShieldCheck,
  Star,
  ArrowRight,
  Compass,
  CheckCircle2,
  TrainTrack,
  ExternalLink,
} from 'lucide-react';
import { Counselor } from '@/types';

interface UzbekMetroVaultProps {
  counselors: Counselor[];
  selectedAmbition: string;
  onSelectAmbition: (ambitionId: string, specialtyKey: string) => void;
}

interface MetroStation {
  id: string;
  name: string;
  city: string;
  line: 'gold' | 'turquoise' | 'lapis';
  lineName: string;
  mentor: {
    name: string;
    role: string;
    credibility: string;
    rating: string;
    sessions: number;
    avatarUrl: string;
    id?: string;
  };
  metrics: string;
  color: string;
  coords: { x: number; y: number };
}

export default function UzbekMetroVault({
  counselors,
  selectedAmbition,
  onSelectAmbition,
}: UzbekMetroVaultProps) {
  const locale = useLocale();
  const [activeStationId, setActiveStationId] = useState<string>('munich');
  const [pulsePos, setPulsePos] = useState<number>(0);

  // Sync activeStationId when selectedAmbition changes from parent
  useEffect(() => {
    if (selectedAmbition === 'job' || selectedAmbition === 'internship') {
      setActiveStationId('munich');
    } else if (selectedAmbition === 'study_abroad') {
      setActiveStationId('columbia');
    } else if (selectedAmbition === 'startup') {
      setActiveStationId('dubai');
    } else if (selectedAmbition === 'switch_career') {
      setActiveStationId('berlin');
    }
  }, [selectedAmbition]);

  // Train beacon pulse animation along the track
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePos((prev) => (prev + 1) % 100);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const stations: MetroStation[] = [
    {
      id: 'munich',
      name: 'Google Myunxen',
      city: 'Myunxen, Germaniya',
      line: 'gold',
      lineName: "Oltin Chiziq • Dasturlash & Big Tech",
      color: '#F59E0B',
      metrics: '52 Sessiya • 100% Qabul',
      coords: { x: 78, y: 26 },
      mentor: {
        name: 'Azizbek Kholmatov',
        role: 'Principal Software Architect',
        credibility: 'Ex-Google Munich • Uzum Market',
        rating: '5.0',
        sessions: 52,
        avatarUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      },
    },
    {
      id: 'columbia',
      name: 'Columbia & Fulbright',
      city: 'Nyu-York, AQSH',
      line: 'turquoise',
      lineName: "Firuza Chiziq • 100% Xalqaro Grantlar",
      color: '#06B6D4',
      metrics: '45 Sessiya • Ivy League',
      coords: { x: 22, y: 32 },
      mentor: {
        name: 'Kamila Yusupova',
        role: 'Global Scholarships Coach',
        credibility: 'Fulbright Scholar • Columbia Alumna',
        rating: '4.9',
        sessions: 45,
        avatarUrl:
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
      },
    },
    {
      id: 'berlin',
      name: 'Charité Berlin',
      city: 'Berlin, Germaniya',
      line: 'gold',
      lineName: "Tibbiyot & BioTech Chiziq",
      color: '#10B981',
      metrics: '38 Sessiya • Ilmiy Grantlar',
      coords: { x: 82, y: 72 },
      mentor: {
        name: 'Dr. Jasur Mansurov',
        role: 'Clinical AI & Residency Mentor',
        credibility: 'Charité Berlin • Ex-Ankara Hospital',
        rating: '4.9',
        sessions: 38,
        avatarUrl:
          'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop',
      },
    },
    {
      id: 'dubai',
      name: 'Venture & Startap Hub',
      city: 'Toshkent / Dubay',
      line: 'lapis',
      lineName: "Lojuvard Chiziq • Startap & Dizayn",
      color: '#E06D1A',
      metrics: '38 Sessiya • Pre-Seed VC',
      coords: { x: 24, y: 74 },
      mentor: {
        name: 'Madina Shodieva',
        role: 'Studio Founder & Product Lead',
        credibility: 'AloqaVentures Mentor • Ex-EPAM',
        rating: '5.0',
        sessions: 38,
        avatarUrl:
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
      },
    },
  ];

  const currentStation = stations.find((s) => s.id === activeStationId) || stations[0];

  return (
    <div className="relative w-full max-w-[480px] mx-auto select-none">
      {/* Radiant Islamic Metro Dome Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(2, 132, 199, 0.25) 0%, rgba(245, 158, 11, 0.22) 40%, rgba(15, 30, 54, 0.15) 70%, transparent 100%)',
        }}
      />

      {/* The Master Islamic Vault (Alisher Navoi & Kosmonavtlar Metro Arch Portal) */}
      <div className="relative z-10 rounded-t-[100px] sm:rounded-t-[130px] rounded-b-3xl bg-[#091324] text-white p-5 sm:p-7 shadow-[0_32px_80px_-20px_rgba(9,19,36,0.65)] border-2 border-[#F59E0B]/40 overflow-hidden">
        
        {/* Authentic Islamic Girih Pattern Header Crown */}
        <div className="absolute top-0 inset-x-0 h-28 pointer-events-none opacity-20 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:16px_16px]" />
        
        {/* Vault Arch Top Apex: Illuminated 8-Point Samarkand Star ("Shamsa") */}
        <div className="flex flex-col items-center justify-center pt-2 pb-4 relative z-10">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-b from-[#F59E0B] to-[#D97706] p-0.5 shadow-[0_0_24px_rgba(245,158,11,0.5)] flex items-center justify-center">
            {/* 8-pointed star SVG */}
            <svg viewBox="0 0 48 48" className="w-10 h-10 text-[#091324] fill-current">
              <path d="M24 0L29.5 12L42.5 6.5L37 19.5L48 24L37 28.5L42.5 41.5L29.5 36L24 48L18.5 36L5.5 41.5L11 28.5L0 24L11 19.5L5.5 6.5L18.5 12Z" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white font-mono">
              ✦
            </div>
          </div>

          {/* Tashkent Metro Inscription Header (Kitoba Band) */}
          <div className="mt-2.5 text-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#F59E0B]">
              TOSHKENT METROPOLITENI • BILIM YO‘LI
            </span>
            <h3 className="font-display font-extrabold text-sm sm:text-base text-white tracking-[-0.02em] mt-0.5">
              O‘zbekistondan Jahon Cho‘qqilarigacha
            </h3>
          </div>
        </div>

        {/* Central Visual: Interactive Metro Constellation Transit Map */}
        <div className="relative mt-2 rounded-2xl bg-[#0F1E36]/80 border border-white/10 p-4 h-[240px] overflow-hidden">
          {/* Subtle Grid Tessellation */}
          <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#0284C7_1px,transparent_1px),linear-gradient(to_bottom,#0284C7_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* SVG Transit Rails & Transit Pulses */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Center Hub to Munich (Gold Line) */}
            <line x1="50" y1="50" x2="78" y2="26" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="1 1" opacity="0.4" />
            <line x1="50" y1="50" x2="78" y2="26" stroke="#F59E0B" strokeWidth="2.5" opacity={activeStationId === 'munich' ? 0.9 : 0.25} />

            {/* Center Hub to Columbia (Turquoise Line) */}
            <line x1="50" y1="50" x2="22" y2="32" stroke="#06B6D4" strokeWidth="2.5" strokeDasharray="1 1" opacity="0.4" />
            <line x1="50" y1="50" x2="22" y2="32" stroke="#06B6D4" strokeWidth="2.5" opacity={activeStationId === 'columbia' ? 0.9 : 0.25} />

            {/* Center Hub to Berlin (Emerald Line) */}
            <line x1="50" y1="50" x2="82" y2="72" stroke="#10B981" strokeWidth="2.5" strokeDasharray="1 1" opacity="0.4" />
            <line x1="50" y1="50" x2="82" y2="72" stroke="#10B981" strokeWidth="2.5" opacity={activeStationId === 'berlin' ? 0.9 : 0.25} />

            {/* Center Hub to Dubai (Coral Line) */}
            <line x1="50" y1="50" x2="24" y2="74" stroke="#E06D1A" strokeWidth="2.5" strokeDasharray="1 1" opacity="0.4" />
            <line x1="50" y1="50" x2="24" y2="74" stroke="#E06D1A" strokeWidth="2.5" opacity={activeStationId === 'dubai' ? 0.9 : 0.25} />

            {/* Orbiting Concentric Astrolabe Rings */}
            <circle cx="50" cy="50" r="32" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="1" fill="none" />
            <circle cx="50" cy="50" r="44" stroke="rgba(2, 132, 199, 0.15)" strokeWidth="1" strokeDasharray="3 3" fill="none" />

            {/* Live Transit Pulse Dot along the active route */}
            {activeStationId === 'munich' && (
              <circle
                cx={50 + (78 - 50) * (pulsePos / 100)}
                cy={50 + (26 - 50) * (pulsePos / 100)}
                r="3"
                fill="#F59E0B"
                className="filter drop-shadow-[0_0_8px_#F59E0B]"
              />
            )}
            {activeStationId === 'columbia' && (
              <circle
                cx={50 + (22 - 50) * (pulsePos / 100)}
                cy={50 + (32 - 50) * (pulsePos / 100)}
                r="3"
                fill="#06B6D4"
                className="filter drop-shadow-[0_0_8px_#06B6D4]"
              />
            )}
            {activeStationId === 'berlin' && (
              <circle
                cx={50 + (82 - 50) * (pulsePos / 100)}
                cy={50 + (72 - 50) * (pulsePos / 100)}
                r="3"
                fill="#10B981"
                className="filter drop-shadow-[0_0_8px_#10B981]"
              />
            )}
            {activeStationId === 'dubai' && (
              <circle
                cx={50 + (24 - 50) * (pulsePos / 100)}
                cy={50 + (74 - 50) * (pulsePos / 100)}
                r="3"
                fill="#E06D1A"
                className="filter drop-shadow-[0_0_8px_#E06D1A]"
              />
            )}
          </svg>

          {/* Central Origin Station: "Toshkent Markaziy Bekati" */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-default z-20"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#0F1E36] border-2 border-[#F59E0B] shadow-[0_0_16px_rgba(245,158,11,0.6)] flex items-center justify-center">
                <span className="text-sm">🏛️</span>
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#F59E0B] animate-ping" />
            </div>
            <span className="font-mono text-[9px] font-black uppercase tracking-wider text-amber-200 mt-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs border border-white/10 whitespace-nowrap shadow-xs">
              Toshkent Markaz
            </span>
          </div>

          {/* Destination Stations (Clickable Interactive Nodes) */}
          {stations.map((st) => {
            const isSelected = st.id === activeStationId;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setActiveStationId(st.id);
                  if (st.id === 'munich') onSelectAmbition('job', 'Engineering & Tech');
                  else if (st.id === 'columbia') onSelectAmbition('study_abroad', 'Study Abroad');
                  else if (st.id === 'berlin') onSelectAmbition('switch_career', 'Medicine & Healthcare');
                  else if (st.id === 'dubai') onSelectAmbition('startup', 'Architecture & Design');
                }}
                style={{ top: `${st.coords.y}%`, left: `${st.coords.x}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group z-20 cursor-pointer focus:outline-hidden transition-transform duration-200 ${
                  isSelected ? 'scale-110' : 'hover:scale-105'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full p-0.5 transition-all shadow-md flex items-center justify-center ${
                    isSelected
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#091324] shadow-[0_0_16px_rgba(245,158,11,0.8)]'
                      : 'border border-white/30 opacity-80 group-hover:opacity-100'
                  }`}
                  style={{ backgroundColor: st.color }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden relative">
                    <Image
                      src={st.mentor.avatarUrl}
                      alt={st.mentor.name}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </div>
                </div>

                <div
                  className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold whitespace-nowrap px-1.5 py-0.5 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-[#F59E0B] text-[#091324]'
                      : 'bg-black/70 text-slate-300 group-hover:text-white'
                  }`}
                >
                  {st.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Active Station Card (Real Uzbek Mentor Profile & Career Path) */}
        <div className="mt-3.5 rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 sm:p-4 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentStation.color }}
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {currentStation.lineName}
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
              {currentStation.city}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#F59E0B]/50 shadow-sm">
              <Image
                src={currentStation.mentor.avatarUrl}
                alt={currentStation.mentor.name}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="font-display font-bold text-sm text-white truncate">
                  {currentStation.mentor.name}
                </h4>
                <ShieldCheck className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                {currentStation.mentor.role}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-amber-200 font-mono">
                <span className="flex items-center gap-0.5 font-bold">
                  <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                  {currentStation.mentor.rating}
                </span>
                <span>•</span>
                <span className="truncate">{currentStation.mentor.credibility}</span>
              </div>
            </div>
          </div>

          {/* Action CTA inside the Metro Pass */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{currentStation.metrics}</span>
            </div>

            <a
              href="#rahnamolar"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#091324] bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:brightness-110 px-3 py-1.5 rounded-full transition-all shadow-xs"
            >
              <span>Yo‘nalishni tanlash</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Metro Token Footer Bar */}
        <div className="mt-3 pt-2 text-center flex items-center justify-center gap-3 text-[10px] font-mono text-slate-400">
          <span>✦ 50+ Top Mentorlar</span>
          <span>•</span>
          <span>1:1 Shaxsiy Yo‘nalish</span>
          <span>•</span>
          <span>100% Rasmiy Sinov</span>
        </div>
      </div>
    </div>
  );
}
