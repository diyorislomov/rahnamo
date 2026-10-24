'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { Counselor } from '@/types';

interface UzbekHeritageVisualProps {
  counselors: Counselor[];
  selectedAmbition: 'job' | 'internship' | 'study_abroad' | 'startup' | 'switch_career';
  onSelectAmbition?: (id: 'job' | 'internship' | 'study_abroad' | 'startup' | 'switch_career', specialtyKey: string) => void;
}

interface MentorShowcase {
  id: string;
  name: string;
  role: string;
  companyTag: string;
  location: string;
  avatarUrl: string;
  rating: string;
  reviewsCount: number;
  sessionsCount: number;
  nextSlot: string;
  expertise: string[];
  mottoUz: string;
  mottoRu: string;
  mottoEn: string;
}

const MENTORS_BY_GOAL: Record<string, MentorShowcase> = {
  job: {
    id: 'azizbek',
    name: 'Azizbek Kholmatov',
    role: 'Principal Software Architect',
    companyTag: 'Ex-Google Munich • Uzum Market',
    location: 'Toshkent / Myunxen',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    rating: '5.0',
    reviewsCount: 38,
    sessionsCount: 52,
    nextSlot: 'Ertaga, 19:30',
    expertise: ['System Design', 'FAANG Mock', 'Xalqaro IT'],
    mottoUz: '«O‘zbek dasturchilari jahonning yetakchi IT kompaniyalarida raqobatbardosh bo‘la oladi.»',
    mottoRu: '«Разработчики из Узбекистана способны конкурировать в глобальном Big Tech.»',
    mottoEn: '«Engineers from Uzbekistan have the capability to compete at the highest tier of global tech.»',
  },
  internship: {
    id: 'azizbek-intern',
    name: 'Azizbek Kholmatov',
    role: 'Principal Software Architect',
    companyTag: 'Ex-Google Munich • Uzum Market',
    location: 'Toshkent / Myunxen',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    rating: '5.0',
    reviewsCount: 38,
    sessionsCount: 52,
    nextSlot: 'Bugun, 21:00',
    expertise: ['GitHub Audit', 'LeetCode Prep', 'Uzum Referal'],
    mottoUz: '«Birinchi stajirovka — katta karyerangizning eng muhim fundamenti.»',
    mottoRu: '«Первая стажировка — важнейший фундамент всей будущей карьеры.»',
    mottoEn: '«Your first internship sets the standard for your entire engineering trajectory.»',
  },
  study_abroad: {
    id: 'kamila',
    name: 'Kamila Yusupova',
    role: 'Global Scholarships Coach',
    companyTag: 'Fulbright Scholar • Columbia Alumna',
    location: 'Toshkent / Nyu-York',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
    rating: '4.9',
    reviewsCount: 42,
    sessionsCount: 45,
    nextSlot: 'Dushanba, 18:00',
    expertise: ['Fulbright & DAAD', 'SOP Tahrir', 'Komissiya Suhbat'],
    mottoUz: '«Har bir iqtidorli talaba dunyoning top universitetida 100% grant yutishga haqli.»',
    mottoRu: '«Каждый талантливый студент достоин 100% гранта в топовом вузе мира.»',
    mottoEn: '«Every ambitious student deserves a real shot at full scholarships at top-tier universities.»',
  },
  startup: {
    id: 'madina',
    name: 'Madina Shodieva',
    role: 'Studio Founder & Product Lead',
    companyTag: 'AloqaVentures Mentor • Ex-EPAM',
    location: 'Samarqand / Dubay',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
    rating: '5.0',
    reviewsCount: 29,
    sessionsCount: 38,
    nextSlot: 'Ertaga, 17:00',
    expertise: ['MVP Arxitektura', 'GTM Strategiya', 'Pitch Deck'],
    mottoUz: '«G‘oyadan real daromad va sarmoyagacha bo‘lgan yo‘lni qisqartiramiz.»',
    mottoRu: '«Сокращаем путь от идеи до первых продаж и венчурных инвестиций.»',
    mottoEn: '«Accelerating the journey from product discovery to paying users and venture capital.»',
  },
  switch_career: {
    id: 'jasur',
    name: 'Dr. Jasur Mansurov',
    role: 'Clinical AI & Residency Mentor',
    companyTag: 'Charité Berlin • Ex-Ankara Hospital',
    location: 'Toshkent / Berlin',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop',
    rating: '4.9',
    reviewsCount: 31,
    sessionsCount: 38,
    nextSlot: 'Chorshanba, 20:00',
    expertise: ['Olmoniya Approbation', 'Karyera O‘tish', 'DeepTech'],
    mottoUz: '«Yangi sohaga dadil qadam tashlang — to‘g‘ri maslahat yillab vaqtingizni tejaydi.»',
    mottoRu: '«Смело меняйте траекторию — верный наставник спасет годы проб и ошибок.»',
    mottoEn: '«A calculated pivot guided by real veterans saves years of trial and error.»',
  },
};

/**
 * Authentic Uzbek Traditional Patterns Visual Component
 * Features:
 * 1. Traditional Girih 8-pointed star rosette (Khatam / Shamsa)
 * 2. Margilan Adras / Ikat woven pattern ribbon
 * 3. Samarkand Koshinkori glazed tile mosaic geometric borders
 * 4. Interactive Live Mentor Showcase with verified credentials
 */
export default function UzbekHeritageVisual({
  counselors,
  selectedAmbition,
}: UzbekHeritageVisualProps) {
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<number>(0);

  const mentor = MENTORS_BY_GOAL[selectedAmbition] || MENTORS_BY_GOAL.job;

  const quote =
    locale === 'ru'
      ? mentor.mottoRu
      : locale === 'en'
        ? mentor.mottoEn
        : mentor.mottoUz;

  return (
    <div className="relative w-full max-w-[500px] mx-auto select-none">
      {/* Ambient Silk Road Golden & Turquoise Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 rounded-[40px] opacity-45 blur-2xl transition-all duration-700"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.28) 0%, rgba(13, 148, 136, 0.16) 40%, rgba(15, 30, 54, 0.08) 70%, transparent 100%)',
        }}
      />

      {/* Main Glassmorphic Card with Authentic Uzbek Girih & Koshinkori Frame */}
      <div className="relative rounded-[32px] bg-white/95 backdrop-blur-xl border-2 border-[#F59E0B]/30 shadow-[0_24px_56px_-16px_rgba(15,30,54,0.18)] overflow-hidden transition-all duration-300">
        {/* TOP ORNAMENTAL BANNER: Authentic Uzbek Ikat / Adras Geometric Pattern Ribbon */}
        <div className="relative h-14 bg-[#0F1E36] overflow-hidden flex items-center justify-between px-5 border-b border-[#F59E0B]/25">
          {/* SVG Adras / Ikat Woven Geometric Pattern Overlay */}
          <svg
            aria-hidden="true"
            className="absolute inset-0 w-full h-full opacity-25"
            preserveAspectRatio="repeat"
          >
            <defs>
              <pattern
                id="uzbek-ikat-strip"
                width="60"
                height="56"
                patternUnits="userSpaceOnUse"
              >
                {/* Traditional Ikat Arrow & Diamond Motifs */}
                <path
                  d="M30 0 L45 28 L30 56 L15 28 Z"
                  fill="#F59E0B"
                  opacity="0.6"
                />
                <path
                  d="M0 0 L15 28 L0 56 Z M60 0 L45 28 L60 56 Z"
                  fill="#0D9488"
                  opacity="0.45"
                />
                <polygon
                  points="30,12 38,28 30,44 22,28"
                  fill="#C25E38"
                  opacity="0.8"
                />
                <circle cx="30" cy="28" r="3.5" fill="#FFFFFF" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#uzbek-ikat-strip)" />
          </svg>

          {/* Left: Traditional Uzbek Medallion Badge */}
          <div className="relative z-10 flex items-center gap-2.5">
            {/* 8-Pointed Samarkand Girih Star Icon */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#C25E38] p-0.5 shadow-sm flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#0F1E36] fill-current">
                <polygon points="12,1.5 15,7.5 22.5,7.5 17,12.5 19.5,19.5 12,15 4.5,19.5 7,12.5 1.5,7.5 9,7.5" />
                <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
              </svg>
            </div>
            <div>
              <span className="block text-[11px] font-mono font-bold tracking-[0.14em] uppercase text-[#F59E0B]">
                {locale === 'ru'
                  ? 'НАЦИОНАЛЬНЫЙ МЕНТОРИНГ'
                  : locale === 'en'
                    ? 'NATIONAL MENTORSHIP'
                    : 'MILLIY RAHNAMOLIK'}
              </span>
              <span className="block text-[10px] text-white/70 font-medium">
                {locale === 'ru'
                  ? 'Традиции & Мировой уровень'
                  : locale === 'en'
                    ? 'Heritage & Global Excellence'
                    : 'An’ana & Jahon Tajribasi'}
              </span>
            </div>
          </div>

          {/* Right: Live Vetted Pill */}
          <div className="relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0D9488]/20 border border-[#0D9488]/40">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-[#5EEAD4] uppercase tracking-wider">
              100% SARALANGAN
            </span>
          </div>
        </div>

        {/* CARD BODY: Traditional Samarkand Girih Watermark + Active Mentor Feature */}
        <div className="relative p-5 sm:p-6 bg-[#FBF9F5]/70">
          {/* Subtle Authentic Girih Mosaic Tessellation in Background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.055]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%230F1E36' stroke-width='1.2'%3E%3Cpolygon points='40,0 48,24 72,16 56,36 80,40 56,44 72,64 48,56 40,80 32,56 8,64 24,44 0,40 24,36 8,16 32,24'/%3E%3Ccircle cx='40' cy='40' r='18'/%3E%3Ccircle cx='40' cy='40' r='8' stroke-dasharray='2 2'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '80px 80px',
            }}
          />

          {/* Mentor Profile Header with Uzbek Ornamental Gold Ring */}
          <div className="relative z-10 flex items-start gap-4">
            {/* Avatar with Traditional Double Gold & Lapis Border */}
            <div className="relative shrink-0">
              <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl p-1 bg-gradient-to-tr from-[#0F1E36] via-[#F59E0B] to-[#0D9488] shadow-md">
                <div className="relative w-full h-full rounded-xl overflow-hidden bg-white">
                  <Image
                    src={mentor.avatarUrl}
                    alt={mentor.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Verified Uzbek Seal Badge */}
              <div
                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-[#0F1E36] text-[#F59E0B] border-2 border-white flex items-center justify-center shadow-sm"
                title="Tasdiqlangan Rahnamo"
              >
                <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
              </div>
            </div>

            {/* Mentor Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-display font-bold text-[#0F1E36] tracking-tight truncate">
                  {mentor.name}
                </h3>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-[#C25E38] truncate mt-0.5">
                {mentor.role}
              </p>

              <p className="text-xs text-[#0F1E36]/80 font-medium truncate mt-0.5 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
                <span>{mentor.companyTag}</span>
              </p>

              {/* Rating & Sessions Pill */}
              <div className="flex items-center gap-3 mt-2 text-xs">
                <div className="flex items-center gap-1 text-[#D97706] font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{mentor.rating}</span>
                  <span className="text-[#64748B] font-normal">
                    ({mentor.reviewsCount})
                  </span>
                </div>
                <span className="text-[#CBD5E1]">•</span>
                <div className="flex items-center gap-1 text-[#475569] font-medium">
                  <Users className="w-3.5 h-3.5 text-[#0F1E36]/60" />
                  <span>{mentor.sessionsCount} sessiya</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cultural Quote Box with Traditional Ornament Framing */}
          <div className="relative z-10 mt-4 p-3.5 rounded-2xl bg-white/90 border border-[#F59E0B]/20 shadow-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-[#F59E0B] text-xl leading-none font-serif select-none">
                ✦
              </span>
              <p className="text-xs text-[#334155] italic leading-relaxed font-serif">
                {quote}
              </p>
            </div>
          </div>

          {/* Core Expertise Tags with Ornamental Pill Design */}
          <div className="relative z-10 mt-3.5 flex flex-wrap gap-1.5">
            {mentor.expertise.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F59E0B]/10 text-[#92400E] border border-[#F59E0B]/25"
              >
                <span>✦</span>
                <span>{tag}</span>
              </span>
            ))}
          </div>

          {/* Action Row: Next Slot & Booking CTA */}
          <div className="relative z-10 mt-4 pt-3.5 border-t border-[#0F1E36]/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#0F1E36]/75">
              <Clock className="w-3.5 h-3.5 text-[#C25E38]" />
              <span className="font-medium">{mentor.nextSlot}</span>
            </div>

            <a
              href="#rahnamolar"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F1E36] hover:bg-[#1B3154] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md hover:scale-[1.02] cursor-pointer"
            >
              <span>{locale === 'ru' ? 'Выбрать' : locale === 'en' ? 'Book 1:1' : '1:1 Bog‘lanish'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#F59E0B]" />
            </a>
          </div>
        </div>

        {/* BOTTOM ORNAMENTAL FOOTER: Authentic Samarkand Majolica Star Border */}
        <div className="h-2.5 bg-gradient-to-r from-[#0F1E36] via-[#F59E0B] to-[#0D9488]" />
      </div>

      {/* FLOATING CULTURAL TRUST BADGES */}
      {/* Top Right: Suzani Sunburst Badge */}
      <div className="absolute -top-3 -right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0F1E36] text-white text-[11px] font-bold shadow-lg border border-[#F59E0B]/40 animate-bounce duration-1000">
        <span className="text-[#F59E0B]">✦</span>
        <span>{locale === 'ru' ? 'Топ-1% Экспертов' : locale === 'en' ? 'Top 1% Mentors' : 'Top-1% Mentorlar'}</span>
      </div>

      {/* Bottom Left: Quick Response Assurance */}
      <div className="absolute -bottom-3 -left-3 z-20 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-[#0F1E36] text-[11px] font-bold shadow-lg border border-[#0F1E36]/10">
        <span className="w-2 h-2 rounded-full bg-[#10B981]" />
        <span>{locale === 'ru' ? 'Ответ в течение 2 часов' : locale === 'en' ? 'Avg response < 2h' : 'Javob: 2 soat ichida'}</span>
      </div>
    </div>
  );
}
