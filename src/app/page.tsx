'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SmoothScroll from '@/components/SmoothScroll';
import CleanHero from '@/components/CleanHero';
import StatsBand from '@/components/StatsBand';
import CareerOsHub from '@/components/CareerOsHub';
import CatalogIntro, { SortOption } from '@/components/CatalogIntro';
import CounselorCard from '@/components/CounselorCard';
import RevealOnScroll from '@/components/RevealOnScroll';
import GoalWaitlist from '@/components/GoalWaitlist';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import { isSupabaseConfigured, mapCounselorRow, PUBLIC_COUNSELOR_COLUMNS } from '@/lib/counselors';
import { supabase } from '@/lib/supabase';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import { Counselor } from '@/types';
import {
  Search,
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
  Compass,
  Sparkles,
  ShieldCheck,
  Target,
  Globe,
  Calendar,
  Award,
  CheckCircle2,
  Star,
} from 'lucide-react';

export default function Home() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const tBecome = useTranslations('becomeCounselor');
  const locale = useLocale();

  const [counselors, setCounselors] = useState<Counselor[]>(() =>
    isSupabaseConfigured() ? [] : INITIAL_COUNSELORS
  );
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    Promise.resolve(supabase.from('counselors').select(PUBLIC_COUNSELOR_COLUMNS))
      .then(({ data, error }) => {
        if (error) throw error;
        setCounselors((data || []).map(mapCounselorRow));
      })
      .catch((err: unknown) => {
        console.error('[COUNSELORS_FETCH_FAILED]', err);
        setCounselors([]);
      });
  }, []);

  const specialtyKeys = useMemo(() => Object.keys(SPECIALTY_CONFIG), []);

  // Filter & Search logic — category and search combine (AND), not replace
  const filteredCounselors = counselors.filter((counselor) => {
    const matchesTag =
      selectedTag === 'All' || counselor.specialties.includes(selectedTag);

    const matchesSearch =
      searchQuery.trim() === '' ||
      counselor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      counselor.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      counselor.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      counselor.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTag && matchesSearch;
  });

  // Sort logic
  const sortedCounselors = [...filteredCounselors].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'popular') return b.reviewsCount - a.reviewsCount;
    if (sortBy === 'price-low') return a.standardPrice - b.standardPrice;
    if (sortBy === 'price-high') return b.standardPrice - a.standardPrice;
    return 0;
  });

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const howItWorksSteps = useMemo(() => {
    if (locale === 'ru') {
      return [
        {
          num: '01',
          motto: 'AI COPILOT',
          title: 'Диагностика и Дорожная Карта',
          body: 'Загрузите резюме в бесплатный AI Resume Checker, определите пробелы в навыках и сгенерируйте пошаговый план развития под вашу цель.',
        },
        {
          num: '02',
          motto: '1:1 MENTORSHIP',
          title: 'Подбор Rahnamo и Практика',
          body: 'Выберите проверенного практика мирового уровня (FAANG, Uzum, Fulbright, DAAD) для аудита кода, мок-интервью или вычитки эссе.',
        },
        {
          num: '03',
          motto: 'OPPORTUNITIES',
          title: 'Оффер или Полный Грант',
          body: 'Откликайтесь на проверенные стажировки, международные стипендии и хакатоны в нашем Opportunity Hub и отслеживайте прогресс до результата.',
        },
      ];
    }
    if (locale === 'en') {
      return [
        {
          num: '01',
          motto: 'AI COPILOT',
          title: 'AI Diagnostic & Custom Roadmap',
          body: 'Upload your resume to the free AI Resume Checker, identify skill gaps, and generate an actionable week-by-week blueprint tailored to your target role.',
        },
        {
          num: '02',
          motto: '1:1 MENTORSHIP',
          title: 'Match with a Rahnamo & Train 1-on-1',
          body: 'Connect with vetted practitioners from Google, Uzum, Fulbright, and DAAD for live mock interviews, CV rewrites, and direct referral guidance.',
        },
        {
          num: '03',
          motto: 'OPPORTUNITIES',
          title: 'Land Offers, Grants & Internships',
          body: 'Apply directly to verified regional & global scholarships, accelerators, and internships in the Opportunity Hub while tracking your progress to victory.',
        },
      ];
    }
    return [
      {
        num: '01',
        motto: 'AI COPILOT',
        title: 'AI Diagnostika va Shaxsiy Yo‘l Xaritasi',
        body: 'Rezyumeni bepul AI Resume Checker orqali tekshiring, yetishmayotgan ko‘nikmalarni aniqlang va maqsadingizga mos haftalik o‘sish rejasini oling.',
      },
      {
        num: '02',
        motto: '1:1 MENTORSHIP',
        title: 'Rahnamoni Tanlash va 1-ga-1 Mashq',
        body: 'Google, Uzum, Fulbright yoki DAAD amaliyotchilari bilan 1-ga-1 video uchrashuvda CV auditi, mock-intervyu va grant esselari bo‘yicha aniq maslahat oling.',
      },
      {
        num: '03',
        motto: 'OPPORTUNITIES',
        title: 'Xalqaro Grant, Stajirovka va Oflfer',
        body: 'Opportunity Hub orqali tasdiqlangan global grantlar, IT Park dasturlari va nufuzli stajirovkalarga topshiring va natijangizni kuzatib boring.',
      },
    ];
  }, [locale]);

  const mentorPerks = [
    {
      icon: Calendar,
      title: tBecome('perks.flexibleTitle'),
      body: tBecome('perks.flexibleBody'),
    },
    {
      icon: Globe,
      title: tBecome('perks.remoteTitle'),
      body: tBecome('perks.remoteBody'),
    },
    {
      icon: Award,
      title: tBecome('perks.brandTitle'),
      body: tBecome('perks.brandBody'),
    },
    {
      icon: ShieldCheck,
      title: tBecome('perks.guaranteedTitle'),
      body: tBecome('perks.guaranteedBody'),
    },
  ];

  // Localized Bento-Grid Ecosystem copy
  const bentoCopy = useMemo(() => {
    if (locale === 'ru') {
      return {
        eyebrow: 'CAREER OPERATING SYSTEM • ЭКОСИСТЕМА',
        heading: 'Современный цифровой Шёлковый путь для вашего карьерного прорыва',
        subheading:
          'Мы объединили ИИ-диагностику навыков, проверенных практиков мирового уровня и измеримые дорожные карты в единой платформе.',
        c1Tag: 'AI CAREER COPILOT',
        c1Title: 'Персональная диагностика и подбор Rahnamo за 60 секунд',
        c1Body:
          'Укажите вашу цель, текущий уровень и бюджет — алгоритм подберёт идеального ментора и построит пошаговый план действий.',
        c1Cta: 'Пройти диагностику →',
        c2Tag: 'PROVEN CREDIBILITY',
        c2Title: 'Сеть верифицированных экспертов',
        c2Body:
          'Каждый Rahnamo проходит ручную проверку дипломов, офферов и опыта работы в глобальных компаниях.',
        c3Tag: 'STRUCTURED ROADMAPS',
        c3Title: 'Измеримый прогресс от первой сессии до оффера',
        c3Body:
          'Никаких абстрактных бесед — каждая встреча фиксирует конкретные артефакты: проверенное резюме, эссе или мок-интервью.',
        c4Tag: 'OPPORTUNITY HUB & FORUM',
        c4Title: 'Региональный хаб грантов, стажировок и Q&A сообщество',
        c4Body:
          'Получайте прямые ответы от менторов в открытом форуме и ранний доступ к международным стипендиям и вакансиям.',
        c4Cta: 'Открыть хаб возможностей →',
      };
    }
    if (locale === 'en') {
      return {
        eyebrow: 'CAREER OPERATING SYSTEM • NEO-SILK ROAD',
        heading: 'A modern digital trade route built for ambitious talent',
        subheading:
          'Combining AI skill-gap diagnostics, ADPList-grade mentor verification, and structured career roadmaps in one unified workspace.',
        c1Tag: 'AI CAREER COPILOT',
        c1Title: 'Interactive Skill-Gap Analysis & 60-Second Mentor Match',
        c1Body:
          'Select your target outcome, current experience level, and budget to generate a tailored action plan and top-matched Rahnamos.',
        c1Cta: 'Launch AI Match Quiz →',
        c2Tag: 'VERIFIED EXPERT NETWORK',
        c2Title: '100% Vetted Global & Regional Practitioners',
        c2Body:
          'Transparent ratings, verified company & scholarship badges, and real session track records across tech, medicine, law, and academia.',
        c3Tag: 'STRUCTURED ROADMAPS',
        c3Title: 'Measurable Career Progression (Guide → Grow → Achieve)',
        c3Body:
          'Move from ambiguity to concrete deliverables: audited resumes, scholarship essays, system design drills, and mock interviews.',
        c4Tag: 'OPPORTUNITY HUB & FORUM',
        c4Title: 'Regional Scholarships, Fellowships & Open Mentor Q&A',
        c4Body:
          'Ask career questions publicly in the community forum and unlock curated international grants and tech tracks.',
        c4Cta: 'Explore Opportunity Hub →',
      };
    }
    return {
      eyebrow: 'CAREER OPERATING SYSTEM • NEO-SILK ROAD',
      heading: 'Karyerangizda katta burilish yasaydigan yaxlit ekotizim',
      subheading:
        'AI ko‘nikmalar tahlili, 100% tasdiqlangan xalqaro amaliyotchilar va aniq o‘lchanadigan yo‘l xaritalari — barchasi bitta platformada.',
      c1Tag: 'AI CAREER COPILOT',
      c1Title: '60 soniyada shaxsiy Skill-Gap tahlil va eng mos Rahnamo',
      c1Body:
        'Maqsadingiz, hozirgi darajangiz va byudjetingizni belgilang — tizim sizga eng mos ustozlarni va 90 kunlik rejangizni shakllantiradi.',
      c1Cta: 'Mos Rahnamoni aniqlash →',
      c2Tag: 'TASDIQLANGAN EKSPERTLAR',
      c2Title: 'Jahon va mintaqa yetakchilaridan 1-ga-1 ustozlik',
      c2Body:
        'Shaffof reytinglar (⭐ 4.9), tasdiqlangan kompaniya va grant belgilari hamda real sessiyalar tajribasi.',
      c3Tag: 'STRUKTURALANGAN YO‘L XARITALARI',
      c3Title: 'Birinchi suhbatdan aniq natijagacha o‘lchanadigan o‘sish',
      c3Body:
        'Quruq suhbat emas — har bir bosqichda aniq natija: tahrirlangan CV, grant essesi, portfoliyo tahlili va mock-intervyu.',
      c4Tag: 'IMKONIYATLAR MARKAZI VA FORUM',
      c4Title: 'Xalqaro grantlar, stajirovkalar va ochiq Rahnamolar Forumi',
      c4Body:
        'Hamjamiyat forumida savolingizga tasdiqlangan mentorlardan javob oling va yangi imkoniyatlarga birinchilardan bo‘lib ulaning.',
      c4Cta: 'Forum va imkoniyatlarni ko‘rish →',
    };
  }, [locale]);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#0F1E36] font-sans antialiased selection:bg-[#F59E0B]/25">
      <SmoothScroll>
        <Navbar />

        {/* 1. Kinetic Hero Section with Interactive Ambition Selector & Dynamic Preview Card */}
        <CleanHero
          counselors={counselors}
          onSelectSpecialty={(specKey) => setSelectedTag(specKey)}
        />

        {/* 2. Venture-Style Trust & Metrics Bar (WIUT, TUIT, INHA, Uzum, Fulbright) */}
        <StatsBand counselors={counselors} />

        {/* 2.5. Interactive Career Operating System Workspace (6 Roadmaps + AI Career Copilot + Opportunity Hub) */}
        <CareerOsHub counselors={counselors} />

        {/* 3. Asymmetric Bento-Grid Ecosystem Section (#ecosystem) */}
        <section
          id="ecosystem"
          className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-10 scroll-mt-24"
        >
          <RevealOnScroll>
            <div className="max-w-3xl mb-12">
              <span className="eyebrow-pill">
                <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                <span>{bentoCopy.eyebrow}</span>
              </span>
              <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-[#0F1E36] tracking-[-0.035em] leading-[1.06] mt-4">
                {bentoCopy.heading}
              </h2>
              <p className="text-sm sm:text-base text-[#475569] mt-3.5 leading-relaxed">
                {bentoCopy.subheading}
              </p>
            </div>
          </RevealOnScroll>

          {/* Asymmetric 12-Col Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Bento Cell 1 (7 Cols — Deep Lapis Lazuli Feature Card): AI Career Copilot */}
            <RevealOnScroll className="lg:col-span-7 h-full">
              <div className="rounded-3xl bg-[#0F1E36] text-white p-7 sm:p-9 border border-[#F59E0B]/30 shadow-[0_24px_54px_-18px_rgba(15,30,54,0.38)] h-full flex flex-col justify-between relative overflow-hidden neo-silk-tessellation-dark">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-[#F59E0B]/35 text-[11px] font-mono font-bold text-[#F59E0B]">
                      <Compass className="w-3.5 h-3.5" />
                      <span>{bentoCopy.c1Tag}</span>
                    </span>
                    <span className="text-xs font-mono text-amber-300/80">01 / BENTO</span>
                  </div>

                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white mt-5 tracking-[-0.025em] leading-snug max-w-xl">
                    {bentoCopy.c1Title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-3 max-w-xl leading-relaxed">
                    {bentoCopy.c1Body}
                  </p>

                  {/* Interactive Readiness Micro-Widget */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { step: '01', label: 'Maqsad & Soha', val: 'Tech / Grant / Law' },
                      { step: '02', label: 'Format & Byudjet', val: '1:1 Video • Q&A' },
                      { step: '03', label: 'AI Moslik Balli', val: '96% Match Fit' },
                    ].map((item) => (
                      <div
                        key={item.step}
                        className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5"
                      >
                        <span className="font-mono text-[10px] font-bold text-[#F59E0B]">
                          STEP {item.step}
                        </span>
                        <div className="font-display font-bold text-xs text-white mt-1">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-amber-200/90 mt-0.5 font-mono">
                          {item.val}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-7 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href="/match"
                    className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#0F1E36] font-extrabold text-xs sm:text-sm px-6 py-3 rounded-full hover:brightness-105 transition-all shadow-md"
                  >
                    <span>{bentoCopy.c1Cta}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                  <span className="text-[11px] font-mono text-slate-400">
                    ⚡ Instant Algorithmic Matching
                  </span>
                </div>
              </div>
            </RevealOnScroll>

            {/* Bento Cell 2 (5 Cols — Alabaster/White Card): Verified Expert Network */}
            <RevealOnScroll delay={90} className="lg:col-span-5 h-full">
              <div className="yv-card h-full">
                <div className="yv-card-inner p-7 sm:p-8 flex flex-col justify-between h-full relative overflow-hidden">
                  <div className="uzc-dot-corner" aria-hidden="true" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F59E0B]/15 border border-[#D97706]/30 text-[11px] font-mono font-bold text-[#92400E]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#D97706]" />
                        <span>{bentoCopy.c2Tag}</span>
                      </span>
                      <span className="text-xs font-mono text-[#64748B]">02 / BENTO</span>
                    </div>

                    <h3 className="font-display font-extrabold text-2xl text-[#0F1E36] mt-5 tracking-[-0.025em] leading-snug">
                      {bentoCopy.c2Title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#475569] mt-2.5 leading-relaxed">
                      {bentoCopy.c2Body}
                    </p>

                    {/* Credibility Pill Cloud (ADPList pattern) */}
                    <div className="mt-6 flex flex-wrap gap-2">
                      {[
                        'Ex-Google Munich',
                        'Uzum Market',
                        'Fulbright Scholar',
                        'Charité Berlin',
                        'LL.M. Leiden',
                        'Ex-Ankara Hospital',
                        'DAAD Fellow',
                      ].map((badge) => (
                        <span
                          key={badge}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FBF9F5] border border-[#0F1E36]/12 text-xs font-bold text-[#0F1E36]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#D97706]" />
                          <span>{badge}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-7 pt-4 border-t border-[#0F1E36]/10 flex items-center justify-between text-xs font-bold text-[#0F1E36] relative z-10">
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                      <span>4.9/5.0 Average Session Rating</span>
                    </span>
                    <a
                      href="#rahnamolar"
                      className="text-[#C25E38] hover:text-[#0F1E36] inline-flex items-center gap-1"
                    >
                      <span>{tCommon('viewCounselors')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            {/* Bento Cell 3 (5 Cols): Structured Career OS Roadmaps */}
            <RevealOnScroll delay={140} className="lg:col-span-5 h-full">
              <div className="yv-card h-full">
                <div className="yv-card-inner p-7 sm:p-8 flex flex-col justify-between h-full relative overflow-hidden">
                  <div className="uzc-dot-corner" aria-hidden="true" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F1E36]/[0.07] text-[11px] font-mono font-bold text-[#0F1E36]">
                        <Target className="w-3.5 h-3.5 text-[#C25E38]" />
                        <span>{bentoCopy.c3Tag}</span>
                      </span>
                      <span className="text-xs font-mono text-[#64748B]">03 / BENTO</span>
                    </div>

                    <h3 className="font-display font-extrabold text-2xl text-[#0F1E36] mt-5 tracking-[-0.025em] leading-snug">
                      {bentoCopy.c3Title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#475569] mt-2.5 leading-relaxed">
                      {bentoCopy.c3Body}
                    </p>

                    <div className="mt-6 space-y-2.5">
                      {howItWorksSteps.map((st) => (
                        <div
                          key={st.num}
                          className="flex items-center justify-between p-3 rounded-2xl bg-[#FBF9F5] border border-[#0F1E36]/10"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-xl bg-[#0F1E36] text-[#F59E0B] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                              {st.num}
                            </span>
                            <span className="font-display font-bold text-xs sm:text-sm text-[#0F1E36] truncate">
                              {st.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#92400E] shrink-0">
                            {st.motto}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            {/* Bento Cell 4 (7 Cols): Regional Opportunity Hub & Forum */}
            <RevealOnScroll delay={190} className="lg:col-span-7 h-full">
              <div className="yv-card h-full">
                <div className="yv-card-inner p-7 sm:p-9 flex flex-col justify-between h-full relative overflow-hidden bg-gradient-to-br from-white via-[#FBF9F5] to-[#FEF3C7]/35">
                  <div className="uzc-dot-corner" aria-hidden="true" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C25E38]/12 border border-[#C25E38]/30 text-[11px] font-mono font-bold text-[#C25E38]">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{bentoCopy.c4Tag}</span>
                      </span>
                      <span className="text-xs font-mono text-[#64748B]">04 / BENTO</span>
                    </div>

                    <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F1E36] mt-5 tracking-[-0.025em] leading-snug max-w-xl">
                      {bentoCopy.c4Title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#475569] mt-3 max-w-xl leading-relaxed">
                      {bentoCopy.c4Body}
                    </p>

                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { tag: 'GRANTLAR', title: 'Fulbright / DAAD / Chevening' },
                        { tag: 'BIG TECH', title: 'SWE & AI Internships' },
                        { tag: 'TIBBIYOT', title: 'Germaniya Approbation' },
                        { tag: 'FORUM Q&A', title: 'Tasdiqlangan javoblar' },
                      ].map((opp) => (
                        <div
                          key={opp.tag}
                          className="rounded-2xl bg-white border border-[#0F1E36]/10 p-3 shadow-2xs"
                        >
                          <div className="text-[10px] font-mono font-bold text-[#C25E38]">
                            {opp.tag}
                          </div>
                          <div className="font-display font-bold text-xs text-[#0F1E36] mt-1 leading-snug">
                            {opp.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-7 pt-5 border-t border-[#0F1E36]/10 flex flex-wrap items-center justify-between gap-3 relative z-10">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link href="/forum" className="btn-yv-primary !text-xs">
                        <span>{bentoCopy.c4Cta}</span>
                        <span className="badge !w-8 !h-8" aria-hidden="true">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </Link>
                      <a href="#early-access" className="btn-yv-outline !text-xs !py-2.5">
                        <span>{tCommon('findMyMentor')}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* 4. How It Works Section (#how-it-works) */}
        <section
          id="how-it-works"
          className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-8 scroll-mt-24"
        >
          <div>
            <RevealOnScroll>
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
                <div>
                  <span className="eyebrow-pill">
                    <span>02 • {t('howItWorks.badge')}</span>
                  </span>
                  <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-[#0F1E36] tracking-[-0.035em] leading-[1.06] mt-3">
                    {t('howItWorks.heading')}
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-[#475569] max-w-md leading-relaxed">
                  {t('howItWorks.subheading')}
                </p>
              </div>
            </RevealOnScroll>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {howItWorksSteps.map((step, idx) => (
                <RevealOnScroll key={step.num} delay={idx * 90} className="h-full">
                  <div className="yv-card h-full">
                    <div className="yv-card-inner p-7 sm:p-8 h-full flex flex-col justify-between relative overflow-hidden min-h-[250px]">
                      <div className="uzc-dot-corner" aria-hidden="true" />

                      <div className="flex items-center justify-between relative z-10">
                        <span className="font-display font-black text-5xl text-[#D97706] tracking-[-0.04em]">
                          {step.num}
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] px-3 py-1 rounded-full bg-[#0F1E36] text-[#F59E0B]">
                          {step.motto}
                        </span>
                      </div>

                      <div className="mt-10 relative z-10">
                        <h3 className="font-display font-bold text-xl text-[#0F1E36] tracking-[-0.02em]">
                          {step.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#475569] mt-2.5 leading-relaxed">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Mentor Discovery Directory & Filters */}
        <CatalogIntro
          counselors={counselors}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          sortBy={sortBy}
          setSortBy={setSortBy}
          specialtyKeys={specialtyKeys}
        />

        <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Elite Mentor Cards Grid (#rahnamolar) */}
          <section id="rahnamolar" className="mb-16 scroll-mt-24">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#0F1E36] tracking-[-0.03em] flex items-center gap-2.5">
                  <span>{t('selectedHeading')}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#0F1E36] text-[#F59E0B] font-mono">
                    {sortedCounselors.length}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] mt-1">
                  {t('selectedSubheading')}
                </p>
              </div>
            </div>

            {sortedCounselors.length === 0 ? (
              <div className="yv-card my-6">
                <div className="yv-card-inner p-12 text-center relative overflow-hidden">
                  <div className="uzc-dot-corner" aria-hidden="true" />
                  <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/15 border border-[#D97706]/30 text-[#D97706] flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="font-display font-bold text-xl text-[#0F1E36] tracking-[-0.02em]">
                    {t('emptyTitle')}
                  </h4>
                  <p className="text-xs sm:text-sm text-[#475569] mt-1.5 max-w-sm mx-auto">
                    {t('emptyBody')}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {(selectedTag !== 'All' || searchQuery.trim() !== '') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTag('All');
                          setSearchQuery('');
                        }}
                        className="btn-yv-primary text-xs cursor-pointer"
                      >
                        <span>{t('emptyReset')}</span>
                        <span className="badge" aria-hidden="true">
                          ↺
                        </span>
                      </button>
                    )}
                    <a href="#early-access" className="btn-yv-outline text-xs">
                      <span>{tCommon('findMyMentor')}</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {sortedCounselors.map((counselor, i) => (
                  <RevealOnScroll key={counselor.id} delay={Math.min(i, 8) * 80} className="h-full">
                    <CounselorCard counselor={counselor} />
                  </RevealOnScroll>
                ))}
              </div>
            )}
          </section>

          {/* 6. Goal-Based Onboarding Waitlist Funnel (#early-access) */}
          <GoalWaitlist />

          {/* 7. Become a Rahnamo Mentor Section (Lapis Lazuli + Desert Amber) */}
          <section className="py-12">
            <div className="rounded-3xl bg-[#0F1E36] text-white p-7 sm:p-11 border border-[#F59E0B]/30 shadow-2xl relative overflow-hidden neo-silk-tessellation-dark">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/10 relative z-10">
                <div className="max-w-xl">
                  <span className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-[#F59E0B]">
                    <span>★</span>
                    <span>{tBecome('badge')}</span>
                  </span>
                  <h2 className="font-display font-extrabold text-2xl sm:text-4xl text-white tracking-[-0.03em] mt-2 leading-tight">
                    {tBecome('heroTitle')}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2.5 leading-relaxed">
                    {tBecome('heroSubtitle')}
                  </p>
                </div>
                <Link
                  href="/become-counselor"
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:brightness-105 text-[#0F1E36] font-extrabold text-xs sm:text-sm px-6 py-3.5 rounded-full shrink-0 transition-all shadow-md"
                >
                  <span>{tCommon('becomeCounselorJoin')}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-7 relative z-10">
                {mentorPerks.map((perk) => {
                  const Icon = perk.icon;
                  return (
                    <div
                      key={perk.title}
                      className="rounded-2xl bg-white/[0.05] border border-white/10 p-4"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center mb-3">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-display font-bold text-sm text-white">
                        {perk.title}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                        {perk.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 8. FAQ Accordion */}
          <section className="py-12 border-t border-[#0F1E36]/10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-4">
                <span className="eyebrow-pill">FAQ</span>
                <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0F1E36] tracking-[-0.035em] mt-3">
                  {t('faq.heading')}
                </h2>
              </div>

              <div className="lg:col-span-8">
                <div className="space-y-3">
                  {(t.raw('faq.items') as { q: string; a: string }[]).map((faq, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <RevealOnScroll key={idx} delay={Math.min(idx, 6) * 60}>
                        <div className="yv-card">
                          <div
                            className={`yv-card-inner transition-all duration-300 overflow-hidden ${
                              isOpen ? 'ring-1 ring-[#F59E0B]/60' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleFaq(idx)}
                              aria-expanded={isOpen}
                              className="w-full p-5 sm:p-6 text-left font-display font-bold text-sm sm:text-base text-[#0F1E36] flex items-center justify-between cursor-pointer gap-4"
                            >
                              <div className="flex items-center gap-3.5">
                                <span className="font-mono text-xs font-bold text-[#D97706]">
                                  0{idx + 1}
                                </span>
                                <span>{faq.q}</span>
                              </div>
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                  isOpen
                                    ? 'bg-[#0F1E36] text-[#F59E0B] rotate-180'
                                    : 'bg-[#FBF9F5] border border-[#0F1E36]/12 text-[#0F1E36]'
                                }`}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </button>

                            {isOpen && (
                              <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-[#475569] leading-relaxed border-t border-[#0F1E36]/10 pt-4">
                                {faq.a}
                              </div>
                            )}
                          </div>
                        </div>
                      </RevealOnScroll>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </SmoothScroll>
    </div>
  );
}
