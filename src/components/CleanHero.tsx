'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Compass,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { Counselor } from '@/types';

interface CleanHeroProps {
  counselors: Counselor[];
  onSelectSpecialty?: (specialtyKey: string) => void;
}

type AmbitionId = 'job' | 'internship' | 'study_abroad' | 'startup' | 'switch_career';

interface AmbitionBlueprint {
  id: AmbitionId;
  emoji: string;
  pillLabel: string;
  specialtyKey: string;
  blueprintTitle: string;
  durationBadge: string;
  readinessScore: number;
  skills: { label: string; pct: number; tag: string }[];
  milestones: [string, string, string];
  fallbackMentor: {
    name: string;
    role: string;
    credibilityTag: string;
    roots: string;
    rating: string;
    sessions: number;
    avatarUrl: string;
  };
}

/**
 * Subtle Neo-Silk Road Constellation & Trade Route Canvas behind the Glassmorphic Blueprint Card
 */
function NeoSilkRoadBackdropCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(300, rect.width) * dpr;
      canvas.height = Math.max(300, rect.height) * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      time += 0.015;

      const starX = w * 0.84;
      const starY = h * 0.16;

      // Concentric Samarkand astrolabe rings
      [0.22, 0.36, 0.52].forEach((rRatio, idx) => {
        ctx.beginPath();
        ctx.arc(starX, starY, w * rRatio, 0, Math.PI * 2);
        ctx.strokeStyle =
          idx === 0
            ? 'rgba(245, 158, 11, 0.28)'
            : idx === 1
              ? 'rgba(15, 30, 54, 0.12)'
              : 'rgba(194, 94, 56, 0.14)';
        ctx.lineWidth = 1;
        ctx.setLineDash(idx % 2 === 1 ? [4, 6] : []);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Twin Silk Road trade trajectories converging at the Guiding Star
      const startA = { x: w * 0.06, y: h * 0.92 };
      const ctrlA = { x: w * 0.42, y: h * 0.52 };
      ctx.beginPath();
      ctx.moveTo(startA.x, startA.y);
      ctx.quadraticCurveTo(ctrlA.x, ctrlA.y, starX, starY);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.38)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Traveling amber pulse along the route
      const tPulse = (time * 0.35) % 1;
      const inv = 1 - tPulse;
      const px = inv * inv * startA.x + 2 * inv * tPulse * ctrlA.x + tPulse * tPulse * starX;
      const py = inv * inv * startA.y + 2 * inv * tPulse * ctrlA.y + tPulse * tPulse * starY;

      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#D97706';
      ctx.fill();

      // 8-Point Samarkand Guiding Star at apex
      ctx.save();
      ctx.translate(starX, starY);
      ctx.rotate(time * 0.25);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? 14 : 5;
        const a = (i * Math.PI) / 4;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = '#F59E0B';
      ctx.fill();
      ctx.restore();

      animId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full"
    />
  );
}

export default function CleanHero({ counselors, onSelectSpecialty }: CleanHeroProps) {
  const t = useTranslations('hero');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [selectedAmbition, setSelectedAmbition] = useState<AmbitionId>('job');

  const ambitions: AmbitionBlueprint[] = useMemo(() => {
    if (locale === 'ru') {
      return [
        {
          id: 'job',
          emoji: '🚀',
          pillLabel: 'Получить работу (Get a job)',
          specialtyKey: 'Engineering & Tech',
          blueprintTitle: 'Software Engineering & Global Tech Offer',
          durationBadge: 'СПРИНТ 90 ДНЕЙ',
          readinessScore: 94,
          skills: [
            { label: 'System Design & Архитектура', pct: 92, tag: 'Приоритет' },
            { label: 'Алгоритмы и Mock-интервью', pct: 88, tag: 'Практика 1:1' },
            { label: 'Резюме и LinkedIn для Европы/США', pct: 96, tag: 'Готово' },
          ],
          milestones: ['Аудит кода и CV', '4 мок-интервью', 'Оффер в компанию'],
          fallbackMentor: {
            name: 'Azizbek Kholmatov',
            role: 'Principal Software Architect',
            credibilityTag: 'Ex-Google Munich • Uzum Market',
            roots: 'Ташкент / Мюнхен',
            rating: '5.0',
            sessions: 52,
            avatarUrl:
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
          },
        },
        {
          id: 'internship',
          emoji: '🌍',
          pillLabel: 'Найти стажировку (Internship)',
          specialtyKey: 'Engineering & Tech',
          blueprintTitle: 'Big Tech & Regional Unicorn Internship Track',
          durationBadge: 'СТАЖИРОВКА 60 ДНЕЙ',
          readinessScore: 92,
          skills: [
            { label: 'GitHub портфолио и Pet-проекты', pct: 91, tag: 'Практика' },
            { label: 'Алгоритмический скрининг (LeetCode)', pct: 87, tag: 'Тренинг' },
            { label: 'Рефералы в Uzum, Яндекс и Big Tech', pct: 94, tag: 'Нетворк' },
          ],
          milestones: ['Ревью резюме', '2 технических скрининга', 'Оффер на стажировку'],
          fallbackMentor: {
            name: 'Azizbek Kholmatov',
            role: 'Principal Software Architect',
            credibilityTag: 'Ex-Google Munich • Uzum Market',
            roots: 'Ташкент / Мюнхен',
            rating: '5.0',
            sessions: 52,
            avatarUrl:
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
          },
        },
        {
          id: 'study_abroad',
          emoji: '🎓',
          pillLabel: 'Учёба за рубежом (Study abroad)',
          specialtyKey: 'Study Abroad',
          blueprintTitle: 'Fulbright, DAAD & Chevening 100% Grant Track',
          durationBadge: 'ПЛАН ПОСТУПЛЕНИЯ',
          readinessScore: 96,
          skills: [
            { label: 'Personal Statement & Эссе', pct: 95, tag: 'Редактура 1:1' },
            { label: 'Подбор вузов и грантового фонда', pct: 91, tag: 'Top-50 ВУЗов' },
            { label: 'Подготовка к интервью комиссии', pct: 89, tag: 'Симуляция' },
          ],
          milestones: ['Шорт-лист программ', 'Пакет документов', '100% Грант'],
          fallbackMentor: {
            name: 'Kamila Yusupova',
            role: 'Global Scholarships Coach',
            credibilityTag: 'Fulbright Scholar • Columbia Alumna',
            roots: 'Ташкент / Нью-Йорк',
            rating: '4.9',
            sessions: 45,
            avatarUrl:
              'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
          },
        },
        {
          id: 'startup',
          emoji: '💡',
          pillLabel: 'Создать стартап (Build a startup)',
          specialtyKey: 'Architecture & Design',
          blueprintTitle: 'Founder GTM, Product Design & VC Pitch',
          durationBadge: 'ОТ ИДЕИ ДО PRE-SEED',
          readinessScore: 91,
          skills: [
            { label: 'Валидация продукта и MVP', pct: 90, tag: 'Трекинг' },
            { label: 'Unit-экономика и GTM-стратегия', pct: 86, tag: 'Разбор' },
            { label: 'Pitch Deck для региональных фондов', pct: 94, tag: 'Инвест-реди' },
          ],
          milestones: ['Проверка гипотез', 'Первые продажи', 'Инвест-питч'],
          fallbackMentor: {
            name: 'Madina Shodieva',
            role: 'Studio Founder & Product Lead',
            credibilityTag: 'AloqaVentures Mentor • Ex-EPAM',
            roots: 'Самарканд / Дубай',
            rating: '5.0',
            sessions: 38,
            avatarUrl:
              'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
          },
        },
        {
          id: 'switch_career',
          emoji: '📈',
          pillLabel: 'Сменить профессию (Switch careers)',
          specialtyKey: 'Medicine & Healthcare',
          blueprintTitle: 'Career Pivot into AI, Data Science & Global Tech',
          durationBadge: 'ТРАНСФОРМАЦИЯ 12 НЕДЕЛЬ',
          readinessScore: 93,
          skills: [
            { label: 'Диагностика переносимых навыков', pct: 92, tag: 'AI Skill-Gap' },
            { label: 'Капстоун-портфолио для новой роли', pct: 95, tag: 'Портфолио' },
            { label: 'Позиционирование и кейс-интервью', pct: 89, tag: '1:1 Менторинг' },
          ],
          milestones: ['Аудит навыков', 'Реальный проект', 'Переход в новую сферу'],
          fallbackMentor: {
            name: 'Dr. Jasur Mansurov',
            role: 'Clinical AI & Residency Mentor',
            credibilityTag: 'Charité Berlin • Ex-Ankara Hospital',
            roots: 'Ташкент / Берлин',
            rating: '4.9',
            sessions: 38,
            avatarUrl:
              'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop',
          },
        },
      ];
    }

    if (locale === 'en') {
      return [
        {
          id: 'job',
          emoji: '🚀',
          pillLabel: 'Get a job',
          specialtyKey: 'Engineering & Tech',
          blueprintTitle: 'Software Engineering & Global Tech Offer',
          durationBadge: '90-DAY SPRINT',
          readinessScore: 94,
          skills: [
            { label: 'System Design & Distributed Architecture', pct: 92, tag: 'High Impact' },
            { label: 'DSA & Live Mock Interviews', pct: 88, tag: '1:1 Drills' },
            { label: 'ATS Resume & Global Referral Strategy', pct: 96, tag: 'Verified' },
          ],
          milestones: ['Skill-Gap Audit', '4 Mock Sprints', 'Global Tech Offer'],
          fallbackMentor: {
            name: 'Azizbek Kholmatov',
            role: 'Principal Software Architect',
            credibilityTag: 'Ex-Google Munich • Uzum Market',
            roots: 'Tashkent / Munich',
            rating: '5.0',
            sessions: 52,
            avatarUrl:
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
          },
        },
        {
          id: 'internship',
          emoji: '🌍',
          pillLabel: 'Find an internship',
          specialtyKey: 'Engineering & Tech',
          blueprintTitle: 'Big Tech & Regional Unicorn Internship Track',
          durationBadge: '60-DAY PLACEMENT',
          readinessScore: 92,
          skills: [
            { label: 'Production GitHub & Capstone Projects', pct: 91, tag: 'Portfolio' },
            { label: 'Coding Assessment & Technical Drills', pct: 87, tag: '1:1 Prep' },
            { label: 'Fast-Track Referrals (Uzum, IT Park, EU)', pct: 94, tag: 'Verified' },
          ],
          milestones: ['CV & GitHub Audit', '2 Mock Screenings', 'Internship Offer'],
          fallbackMentor: {
            name: 'Azizbek Kholmatov',
            role: 'Principal Software Architect',
            credibilityTag: 'Ex-Google Munich • Uzum Market',
            roots: 'Tashkent / Munich',
            rating: '5.0',
            sessions: 52,
            avatarUrl:
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
          },
        },
        {
          id: 'study_abroad',
          emoji: '🎓',
          pillLabel: 'Study abroad',
          specialtyKey: 'Study Abroad',
          blueprintTitle: 'Fulbright, DAAD & Chevening 100% Grant Track',
          durationBadge: 'SCHOLARSHIP OS',
          readinessScore: 96,
          skills: [
            { label: 'Personal Statement & Narrative Arc', pct: 95, tag: '1:1 Review' },
            { label: 'University & Fellowship Matching', pct: 91, tag: 'Top-50 Global' },
            { label: 'Selection Panel Mock Interview', pct: 89, tag: 'Simulation' },
          ],
          milestones: ['Program Shortlist', 'Essay Polish', 'Full Scholarship'],
          fallbackMentor: {
            name: 'Kamila Yusupova',
            role: 'Global Scholarships Coach',
            credibilityTag: 'Fulbright Scholar • Columbia Alumna',
            roots: 'Tashkent / New York',
            rating: '4.9',
            sessions: 45,
            avatarUrl:
              'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
          },
        },
        {
          id: 'startup',
          emoji: '💡',
          pillLabel: 'Build a startup',
          specialtyKey: 'Architecture & Design',
          blueprintTitle: 'Founder GTM, Product Design & VC Pitch',
          durationBadge: 'IDEA TO PRE-SEED',
          readinessScore: 91,
          skills: [
            { label: 'Product Discovery & MVP Architecture', pct: 90, tag: 'Founder Track' },
            { label: 'Unit Economics & Go-To-Market', pct: 86, tag: 'Growth' },
            { label: 'Investor Deck & Demo Day Readiness', pct: 94, tag: 'VC Ready' },
          ],
          milestones: ['Customer Discovery', 'First Traction', 'Pre-Seed Raise'],
          fallbackMentor: {
            name: 'Madina Shodieva',
            role: 'Studio Founder & Product Lead',
            credibilityTag: 'AloqaVentures Mentor • Ex-EPAM',
            roots: 'Samarkand / Dubai',
            rating: '5.0',
            sessions: 38,
            avatarUrl:
              'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
          },
        },
        {
          id: 'switch_career',
          emoji: '📈',
          pillLabel: 'Switch careers',
          specialtyKey: 'Medicine & Healthcare',
          blueprintTitle: 'Career Pivot into AI, Data Science & Product',
          durationBadge: '12-WEEK PIVOT',
          readinessScore: 93,
          skills: [
            { label: 'Transferable Skill-Gap Diagnostics', pct: 92, tag: 'Applied AI' },
            { label: 'Industry Capstone & Case Portfolio', pct: 95, tag: 'Portfolio' },
            { label: 'Technical Case & Domain Interviews', pct: 89, tag: '1:1 Coaching' },
          ],
          milestones: ['Gap Diagnostic', 'Production Capstone', 'Role Transition'],
          fallbackMentor: {
            name: 'Dr. Jasur Mansurov',
            role: 'Clinical AI & Residency Mentor',
            credibilityTag: 'Charité Berlin • Ex-Ankara Hospital',
            roots: 'Tashkent / Berlin',
            rating: '4.9',
            sessions: 38,
            avatarUrl:
              'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop',
          },
        },
      ];
    }

    // Default Uzbek (UZ) — All 5 Master Plan Onboarding Goals
    return [
      {
        id: 'job',
        emoji: '🚀',
        pillLabel: 'Get a job • Ishga kirish',
        specialtyKey: 'Engineering & Tech',
        blueprintTitle: 'Dasturlash, System Design va Xalqaro IT Offer',
        durationBadge: '90 KUNLIK SPRINT',
        readinessScore: 94,
        skills: [
          { label: 'System Design va Tizim Arxitekturasi', pct: 92, tag: 'Yuqori ta’sir' },
          { label: 'Algoritmlar va Real Mock-Intervyu', pct: 88, tag: '1:1 Mashq' },
          { label: 'Xalqaro CV, LinkedIn va Referal', pct: 96, tag: 'Tasdiqlangan' },
        ],
        milestones: ['Skill-Gap Tahlil', '4 ta Mock Suhbat', 'Global IT Offer'],
        fallbackMentor: {
          name: 'Azizbek Kholmatov',
          role: 'Principal Software Architect',
          credibilityTag: 'Ex-Google Munich • Uzum Market',
          roots: 'Tashkent / Munich',
          rating: '5.0',
          sessions: 52,
          avatarUrl:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
        },
      },
      {
        id: 'internship',
        emoji: '🌍',
        pillLabel: 'Find an internship • Stajirovka',
        specialtyKey: 'Engineering & Tech',
        blueprintTitle: 'Big Tech va Yetakchi Kompaniyalarda Stajirovka',
        durationBadge: '60 KUNLIK DASTUR',
        readinessScore: 92,
        skills: [
          { label: 'GitHub Portfoliyo va Real Loyihalar', pct: 91, tag: 'Amaliyot' },
          { label: 'Texnik Saralash va Kodlash Sinovi', pct: 87, tag: '1:1 Tayyorgarlik' },
          { label: 'Uzum, IT Park va Xalqaro Referal', pct: 94, tag: 'Tasdiqlangan' },
        ],
        milestones: ['CV & GitHub Tahlil', '2 ta Sinov Suhbat', 'Stajirovka Offeri'],
        fallbackMentor: {
          name: 'Azizbek Kholmatov',
          role: 'Principal Software Architect',
          credibilityTag: 'Ex-Google Munich • Uzum Market',
          roots: 'Tashkent / Munich',
          rating: '5.0',
          sessions: 52,
          avatarUrl:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
        },
      },
      {
        id: 'study_abroad',
        emoji: '🎓',
        pillLabel: 'Study abroad • Xorijda o‘qish',
        specialtyKey: 'Study Abroad',
        blueprintTitle: 'Fulbright, DAAD va Chevening 100% Grant Yo‘li',
        durationBadge: 'GRANT YO‘L XARITASI',
        readinessScore: 96,
        skills: [
          { label: 'Motivation Letter va Shaxsiy Hikoya', pct: 95, tag: '1:1 Tahrir' },
          { label: 'Top-50 Universitet va Grant Tanlash', pct: 91, tag: 'Strategiya' },
          { label: 'Komissiya Suhbatiga Tayyorgarlik', pct: 89, tag: 'Simulyatsiya' },
        ],
        milestones: ['Dasturlar ro‘yxati', 'Esse va hujjatlar', '100% To‘liq Grant'],
        fallbackMentor: {
          name: 'Kamila Yusupova',
          role: 'Global Scholarships Coach',
          credibilityTag: 'Fulbright Scholar • Columbia Alumna',
          roots: 'Tashkent / New York',
          rating: '4.9',
          sessions: 45,
          avatarUrl:
            'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
        },
      },
      {
        id: 'startup',
        emoji: '💡',
        pillLabel: 'Build a startup • Startap',
        specialtyKey: 'Architecture & Design',
        blueprintTitle: 'Startap GTM, Mahsulot Dizayni va Venchur Pitch',
        durationBadge: 'G‘OYADAN INVESTITSIYAGACHA',
        readinessScore: 91,
        skills: [
          { label: 'MVP Arxitekturasi va Mijoz Intervyusi', pct: 90, tag: 'Asoschi' },
          { label: 'Unit-iqtisodiyot va Go-To-Market', pct: 86, tag: 'O‘sish' },
          { label: 'Pitch Deck va Venchur Fondlar Muloqoti', pct: 94, tag: 'VC Ready' },
        ],
        milestones: ['Gipoteza sinovi', 'Ilk mijozlar', 'Pre-Seed Sarmoya'],
        fallbackMentor: {
          name: 'Madina Shodieva',
          role: 'Studio Founder & Product Lead',
          credibilityTag: 'AloqaVentures Mentor • Ex-EPAM',
          roots: 'Samarkand / Dubai',
          rating: '5.0',
          sessions: 38,
          avatarUrl:
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
        },
      },
      {
        id: 'switch_career',
        emoji: '📈',
        pillLabel: 'Switch careers • Soha almashtirish',
        specialtyKey: 'Medicine & Healthcare',
        blueprintTitle: 'Yangi Sohaga O‘tish: AI, Data Science va Global Litsenziya',
        durationBadge: '12 HAFTALIK BURILISH',
        readinessScore: 93,
        skills: [
          { label: 'Ko‘nikmalar Diagnostikasi (AI Skill-Gap)', pct: 92, tag: 'Deep Tech' },
          { label: 'Yangi Soha Uchun Real Portfoliyo', pct: 95, tag: 'Loyiha' },
          { label: 'Texnik va Keys-Stadi Intervyu Mashqi', pct: 89, tag: '1:1 Ustozlik' },
        ],
        milestones: ['Diagnostika', 'Real loyiha', 'Yangi karyera'],
        fallbackMentor: {
          name: 'Dr. Jasur Mansurov',
          role: 'Clinical AI & Residency Mentor',
          credibilityTag: 'Charité Berlin • Ex-Ankara Hospital',
          roots: 'Tashkent / Berlin',
          rating: '4.9',
          sessions: 38,
          avatarUrl:
            'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop',
        },
      },
    ];
  }, [locale]);

  const activeBlueprint =
    ambitions.find((a) => a.id === selectedAmbition) || ambitions[0];

  // Match a live counselor if available for this specialty, else use rich Neo-Silk Road preview
  const matchedLiveCounselor = useMemo(() => {
    return (
      counselors.find((c) => c.specialties.includes(activeBlueprint.specialtyKey)) ||
      counselors[0]
    );
  }, [activeBlueprint.specialtyKey, counselors]);

  const handleSelectAmbition = (ambition: AmbitionBlueprint) => {
    setSelectedAmbition(ambition.id);
    if (onSelectSpecialty) {
      onSelectSpecialty(ambition.specialtyKey);
    }
  };

  const wingsMotto =
    locale === 'ru'
      ? 'ВЫ СОЗДАЁТЕ — МЫ ДАЁМ КРЫЛЬЯ'
      : locale === 'en'
        ? 'YOU CREATE, WE GIVE WINGS'
        : 'MAQSADINGIZNI ANIQLANG VA UNGA TEZROQ ERISHING';

  const selectorPrompt =
    locale === 'ru'
      ? 'Выберите вашу цель, чтобы построить маршрут:'
      : locale === 'en'
        ? 'Select your ambition to generate your live career blueprint:'
        : 'Karyera yo‘l xaritangizni ko‘rish uchun maqsadingizni tanlang:';

  return (
    <section className="relative overflow-hidden pt-6 sm:pt-10 pb-14 sm:pb-20 neo-silk-tessellation">
      {/* Warm Alabaster + Desert Amber & Lapis Lazuli Ambient Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -left-24 w-[520px] h-[520px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, rgba(194, 94, 56, 0.06) 45%, transparent 70%)',
          filter: 'blur(32px)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-16 right-0 w-[480px] h-[480px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(15, 30, 54, 0.09) 0%, rgba(245, 158, 11, 0.08) 50%, transparent 72%)',
          filter: 'blur(32px)',
        }}
      />

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 items-center">
          {/* LEFT COLUMN: Kinetic Typography + Interactive Ambition Selector + Primary CTAs */}
          <div className="lg:col-span-7 text-left">
            {/* Heritage + Career OS Badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#0F1E36] text-white px-3.5 py-1.5 text-[11px] font-mono font-bold uppercase tracking-[0.14em] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#C25E38] animate-pulse" />
                <span>{wingsMotto}</span>
              </span>
              <span className="eyebrow-pill">
                <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                <span>{t('badge')}</span>
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-[3.85rem] text-[#0F1E36] leading-[1.05] tracking-[-0.035em] mt-6">
              {t.rich('title', {
                strong: (chunks) => (
                  <span className="relative inline-block bg-gradient-to-r from-[#D97706] via-[#C25E38] to-[#0F1E36] bg-clip-text text-transparent">
                    {chunks}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 240 12"
                      fill="none"
                      className="w-full h-2.5 mt-0.5 text-[#F59E0B]"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M2 9.5C58 2.5 162 1.5 238 7.5"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                ),
              })}
            </h1>

            <p className="mt-5 text-base sm:text-lg text-[#475569] max-w-xl leading-relaxed">
              {t('subtitle')}
            </p>

            {/* Interactive Ambition Selector (Preplaced & GrowthMentor Pattern) */}
            <div className="mt-7 p-4 sm:p-5 rounded-3xl bg-white/85 backdrop-blur-md border border-[#0F1E36]/10 shadow-[0_12px_36px_-16px_rgba(15,30,54,0.1)]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-[0.12em] text-[#0F1E36]">
                  {selectorPrompt}
                </span>
                <span className="text-[11px] font-mono font-semibold text-[#C25E38]">
                  LIVE BLUEPRINT
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="tablist">
                {ambitions.map((ambition) => {
                  const isActive = ambition.id === selectedAmbition;
                  return (
                    <button
                      key={ambition.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleSelectAmbition(ambition)}
                      className={`flex items-center justify-between gap-2 px-4 py-3 rounded-2xl text-left text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#0F1E36] text-white border-[#0F1E36] shadow-[0_10px_24px_-8px_rgba(15,30,54,0.35)]'
                          : 'bg-[#FBF9F5] hover:bg-white text-[#0F1E36] border-[#0F1E36]/10 hover:border-[#F59E0B]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <span className="text-base shrink-0">{ambition.emoji}</span>
                        <span className="truncate">{ambition.pillLabel}</span>
                      </span>
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                          isActive
                            ? 'bg-[#F59E0B] text-[#0F1E36]'
                            : 'bg-[#0F1E36]/[0.06] text-[#475569]'
                        }`}
                      >
                        →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary & Secondary CTAs */}
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <a href="#rahnamolar" className="btn-yv-primary">
                <span>{tCommon('viewCounselors')}</span>
                <span className="badge" aria-hidden="true">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </a>

              <a
                href="#ai-copilot"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('rahnamo:tab', { detail: 'ai_copilot' }))
                }
                className="btn-yv-outline"
              >
                <Sparkles className="w-4 h-4 text-[#D97706]" />
                <span>
                  {locale === 'ru'
                    ? 'AI Карьерный Советник'
                    : locale === 'en'
                      ? 'AI Career Advisor & Roadmaps'
                      : 'AI Karyera Maslahatchi & Yo‘l Xarita'}
                </span>
              </a>

              <Link href="/match" className="btn-yv-outline">
                <Compass className="w-4 h-4 text-[#D97706]" />
                <span>{tCommon('findMyMentor')}</span>
              </Link>

              <Link
                href="/become-counselor"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F1E36] hover:text-[#D97706] px-3 py-2 rounded-full transition-colors"
              >
                <span>{tCommon('becomeCounselor')}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C25E38]" />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Dynamic Glassmorphic AI Skill-Gap & Top-Matched Rahnamo Preview Card */}
          <div className="lg:col-span-5 relative min-h-[480px] flex items-center justify-center">
            <div className="absolute -inset-4 rounded-[2.25rem] overflow-hidden">
              <NeoSilkRoadBackdropCanvas />
            </div>

            <div className="relative z-10 w-full max-w-[440px]">
              {/* Main Lapis Lazuli + Alabaster Glassmorphic Career Operating System Card */}
              <div className="rounded-3xl bg-[#0F1E36] text-white p-6 sm:p-7 shadow-[0_28px_64px_-16px_rgba(15,30,54,0.45)] border border-[#F59E0B]/30 relative overflow-hidden neo-silk-tessellation-dark">
                {/* Top Status Header */}
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C25E38] ring-4 ring-[#C25E38]/25" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#F59E0B]">
                      AI SKILL-GAP & ROADMAP OS
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-mono font-bold text-amber-300 border border-white/10">
                    {activeBlueprint.durationBadge}
                  </span>
                </div>

                {/* Blueprint Outcome Title & Readiness Score */}
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
                      {activeBlueprint.emoji} {activeBlueprint.pillLabel}
                    </div>
                    <h2 className="font-display font-bold text-lg sm:text-xl text-white mt-1 leading-snug">
                      {activeBlueprint.blueprintTitle}
                    </h2>
                  </div>
                  <div className="shrink-0 text-right bg-white/[0.07] border border-[#F59E0B]/30 rounded-2xl px-3 py-2">
                    <div className="font-mono font-extrabold text-xl text-[#F59E0B] leading-none">
                      {activeBlueprint.readinessScore}%
                    </div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-slate-300 mt-1">
                      MATCH FIT
                    </div>
                  </div>
                </div>

                {/* AI Skill-Gap Progress Bars */}
                <div className="mt-5 space-y-3 bg-white/[0.04] rounded-2xl p-4 border border-white/[0.08]">
                  {activeBlueprint.skills.map((skill) => (
                    <div key={skill.label}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-200 truncate pr-2">
                          {skill.label}
                        </span>
                        <span className="inline-flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#C25E38]/25 text-amber-200 border border-[#C25E38]/40">
                            {skill.tag}
                          </span>
                          <span className="font-mono font-bold text-[#F59E0B]">
                            {skill.pct}%
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#C25E38] transition-all duration-500"
                          style={{ width: `${skill.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3-Step Structured Milestones (Chronus / Qooper Career OS style) */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {activeBlueprint.milestones.map((m, idx) => (
                    <div
                      key={m}
                      className="rounded-xl bg-white/[0.05] border border-white/10 px-2.5 py-2 text-left"
                    >
                      <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#F59E0B]">
                        <CheckCircle2 className="w-3 h-3 text-[#F59E0B] shrink-0" />
                        <span>0{idx + 1}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-white mt-0.5 truncate">
                        {m}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top-Matched Rahnamo Preview Card (ADPList Social Proof) */}
                <div className="mt-5 rounded-2xl bg-[#FBF9F5] text-[#0F1E36] p-4 border border-[#F59E0B]/40 shadow-lg">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#0F1E36] bg-[#F59E0B]/20 px-2.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3 text-[#D97706]" />
                      <span>{tCommon('verifiedBadge')}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0F1E36]">
                      <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                      <span>
                        {matchedLiveCounselor
                          ? matchedLiveCounselor.rating.toFixed(1)
                          : activeBlueprint.fallbackMentor.rating}
                      </span>
                      <span className="text-[#64748B] font-normal text-[11px]">
                        •{' '}
                        {matchedLiveCounselor
                          ? matchedLiveCounselor.totalSessions || matchedLiveCounselor.reviewsCount
                          : activeBlueprint.fallbackMentor.sessions}{' '}
                        sessions
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <Image
                      src={
                        matchedLiveCounselor?.avatarUrl ||
                        activeBlueprint.fallbackMentor.avatarUrl
                      }
                      alt={
                        matchedLiveCounselor?.fullName ||
                        activeBlueprint.fallbackMentor.name
                      }
                      width={52}
                      height={52}
                      className="w-13 h-13 rounded-2xl object-cover border-2 border-[#F59E0B] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-sm sm:text-base text-[#0F1E36] truncate">
                        {matchedLiveCounselor?.fullName ||
                          activeBlueprint.fallbackMentor.name}
                      </h3>
                      <p className="text-xs font-semibold text-[#C25E38] truncate">
                        {matchedLiveCounselor?.company ||
                          activeBlueprint.fallbackMentor.credibilityTag}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-[#475569] mt-0.5">
                        <MapPin className="w-3 h-3 text-[#D97706] shrink-0" />
                        <span className="truncate">
                          {activeBlueprint.fallbackMentor.roots}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-[#0F1E36]/10 flex items-center justify-between gap-2">
                    <Link
                      href={
                        matchedLiveCounselor
                          ? `/counselors/${matchedLiveCounselor.id}`
                          : '#early-access'
                      }
                      className="w-full inline-flex items-center justify-between bg-[#0F1E36] hover:bg-[#1B3154] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
                    >
                      <span>
                        {matchedLiveCounselor ? t('viewProfile') : t('emptyCardCta')}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-[#F59E0B]" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
