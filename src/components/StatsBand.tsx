'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Counselor } from '@/types';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import AnimatedNumber from './AnimatedNumber';

interface StatsBandProps {
  counselors: Counselor[];
}

const UNIVERSITY_AND_ECOSYSTEM_HUBS = [
  { code: 'WIUT', name: 'Westminster International University in Tashkent' },
  { code: 'TUIT', name: 'Tashkent University of Information Technologies' },
  { code: 'INHA', name: 'Inha University in Tashkent' },
  { code: 'NEWUU', name: 'New Uzbekistan University' },
  { code: 'UZUM', name: 'Uzum Market Tech' },
  { code: 'IT PARK', name: 'IT Park Uzbekistan' },
  { code: 'FULBRIGHT', name: 'US Global Scholar Network' },
  { code: 'DAAD', name: 'German Academic Exchange' },
];

export default function StatsBand({ counselors }: StatsBandProps) {
  const t = useTranslations('statsBand');
  const locale = useLocale();

  const metrics = useMemo(() => {
    const counselorCount = counselors.length > 0 ? counselors.length : 55;
    const categoryCount = Object.keys(SPECIALTY_CONFIG).filter((k) => k !== 'All').length;

    if (locale === 'ru') {
      return [
        {
          value: 1500,
          suffix: '+',
          label: 'Активных менти и маршрутов',
          sub: 'Студенты и молодые специалисты ЦА',
        },
        {
          value: counselorCount,
          suffix: '+',
          label: t('counselors'),
          sub: 'Ex-Google, Uzum, Fulbright, Charité',
        },
        {
          value: 94,
          suffix: '%',
          label: 'Успешных кейсов и грантов',
          sub: 'Офферы, резидентура и стипендии',
        },
        {
          value: categoryCount,
          suffix: '',
          label: t('specialtyCategories'),
          sub: 'IT, Гранты, Медицина, Право, Дизайн',
        },
      ];
    }

    if (locale === 'en') {
      return [
        {
          value: 1500,
          suffix: '+',
          label: 'Active Mentees & Roadmaps',
          sub: 'Across Central Asia & Diaspora',
        },
        {
          value: counselorCount,
          suffix: '+',
          label: t('counselors'),
          sub: 'Ex-Google, Uzum, Fulbright, Charité',
        },
        {
          value: 94,
          suffix: '%',
          label: 'Scholarship & Offer Rate',
          sub: 'Verified 1-on-1 outcome tracking',
        },
        {
          value: categoryCount,
          suffix: '',
          label: t('specialtyCategories'),
          sub: 'Tech, Grants, Medicine, Law, Design',
        },
      ];
    }

    return [
      {
        value: 1500,
        suffix: '+',
        label: 'Faol talabalar va yo‘l xaritalari',
        sub: 'Markaziy Osiyo va xalqaro diaspora',
      },
      {
        value: counselorCount,
        suffix: '+',
        label: t('counselors'),
        sub: 'Ex-Google, Uzum, Fulbright, Charité',
      },
      {
        value: 94,
        suffix: '%',
        label: 'Grant va IT Offer ko‘rsatkichi',
        sub: 'Tasdiqlangan 1-ga-1 natijalar',
      },
      {
        value: categoryCount,
        suffix: '',
        label: t('specialtyCategories'),
        sub: 'IT, Data & AI, Moliya, Xalqaro Grantlar',
      },
    ];
  }, [counselors.length, locale, t]);

  const partnerHeading =
    locale === 'ru'
      ? 'СООБЩЕСТВО СТУДЕНТОВ И ВЫПУСКНИКОВ ВЕДУЩИХ ВУЗОВ И КОМПАНИЙ'
      : locale === 'en'
        ? 'TRUSTED BY TALENT & ALUMNI ACROSS TOP UNIVERSITIES & TECH HUBS'
        : 'YETAKCHI UNIVERSITETLAR VA TEXNOLOGIYA MARKAZLARI TALABALARI TANLOVI';

  return (
    <section className="bg-[#0F1E36] text-white border-y border-[#F59E0B]/25 relative overflow-hidden neo-silk-tessellation-dark">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* 4-Column High-Contrast Venture Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-white/10">
          {metrics.map((m, idx) => (
            <div
              key={m.label}
              className="lg:px-7 first:lg:pl-0 last:lg:pr-0 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#F59E0B]">
                  0{idx + 1} • METRIC
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#C25E38]" />
              </div>

              <div className="font-display font-extrabold text-4xl sm:text-5xl text-white tracking-[-0.04em] mt-2 flex items-baseline gap-0.5">
                <AnimatedNumber value={m.value} />
                <span className="text-[#F59E0B]">{m.suffix}</span>
              </div>

              <div className="mt-2">
                <div className="text-xs sm:text-sm font-bold text-white">{m.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{m.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Partner Universities & Regional Ecosystem Strip (WIUT, TUIT, INHA, etc.) */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-amber-300/90 shrink-0">
            {partnerHeading}
          </span>

          <div className="relative flex overflow-hidden mask-fade-x max-w-full lg:max-w-[760px]">
            <div className="flex items-center gap-7 animate-uzc-marquee whitespace-nowrap py-1">
              {[...UNIVERSITY_AND_ECOSYSTEM_HUBS, ...UNIVERSITY_AND_ECOSYSTEM_HUBS].map(
                (uni, i) => (
                  <div
                    key={`${uni.code}-${i}`}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs"
                  >
                    <span className="font-display font-extrabold text-[#F59E0B]">
                      {uni.code}
                    </span>
                    <span className="text-[11px] text-slate-300">{uni.name}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
