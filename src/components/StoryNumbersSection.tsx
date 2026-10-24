'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Counselor } from '@/types';

interface StoryNumbersSectionProps {
  counselors: Counselor[];
}

interface StoryBeat {
  kicker: string;
  numberText: string;
  unitLabel: string;
  description: string;
  tone: 'dark' | 'muted';
}

export default function StoryNumbersSection({ counselors }: StoryNumbersSectionProps) {
  const locale = useLocale();
  const [step, setStep] = useState<number>(0);
  const stepRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Auto-advance every 5s so the particle transition can be enjoyed automatically or clicked
  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const beats: StoryBeat[] = useMemo(() => {
    const mentorCount = counselors.length > 0 ? String(counselors.length) : '55';

    if (locale === 'ru') {
      return [
        {
          kicker: 'ТРАЕКТОРИИ РОСТА',
          numberText: '1,500+',
          unitLabel: 'КАРЬЕРНЫХ ЦЕЛЕЙ И ЗАПРОСОВ',
          description:
            'Каждая точка — амбициозная цель студента или специалиста: от стажировки в Big Tech до гранта за рубежом.',
          tone: 'dark',
        },
        {
          kicker: 'ОТБОР МЕНТОРОВ',
          numberText: mentorCount,
          unitLabel: 'ПРОВЕРЕННЫХ RAHNAMO',
          description:
            'Мы отбираем практиков с реальным опытом в ведущих компаниях и университетах мира для работы 1-на-1.',
          tone: 'muted',
        },
        {
          kicker: 'ФОРМАТ СЕССИЙ',
          numberText: '1:1',
          unitLabel: 'ЛИЧНАЯ ДОРОЖНАЯ КАРТА',
          description:
            'Никакой воды и общих лекций — за 30–45 минут вы получаете конкретный план действий по вашей задаче.',
          tone: 'dark',
        },
        {
          kicker: 'ПУТЕВОДНАЯ ЗВЕЗДА',
          numberText: '3',
          unitLabel: 'ШАГА: GUIDE • GROW • ACHIEVE',
          description:
            'Выберите направление, забронируйте удобный слот и двигайтесь к результату вместе с вашим Rahnamo.',
          tone: 'dark',
        },
      ];
    }

    if (locale === 'en') {
      return [
        {
          kicker: 'SILK ROAD HORIZONS',
          numberText: '1,500+',
          unitLabel: 'AMBITIOUS CAREER GOALS',
          description:
            'Every dot represents a real ambition — from landing a software engineering role to winning a full international scholarship.',
          tone: 'dark',
        },
        {
          kicker: 'CURATED GUIDES',
          numberText: mentorCount,
          unitLabel: 'VERIFIED RAHNAMO MENTORS',
          description:
            'Only practitioners who have walked the exact path at top global companies and universities join the platform.',
          tone: 'muted',
        },
        {
          kicker: 'DIRECT CLARITY',
          numberText: '1:1',
          unitLabel: 'PERSONALIZED ROADMAP',
          description:
            'No generic courses — get a concrete 90-day action plan tailored to your background in a single session.',
          tone: 'dark',
        },
        {
          kicker: 'THE GUIDING STAR',
          numberText: '3',
          unitLabel: 'STEPS: GUIDE • GROW • ACHIEVE',
          description:
            'Explore verified mentors, connect in 1:1 video or text sessions, and achieve measurable career milestones.',
          tone: 'dark',
        },
      ];
    }

    return [
      {
        kicker: 'IPAK YO‘LIUFQLARI',
        numberText: '1,500+',
        unitLabel: 'KARYERA VA TA’LIM MAQSADLARI',
        description:
          'Har bir nuqta — bitta katta maqsad. Xalqaro grant yutishdan tortib, kuchli IT kompaniyada ish boshlashgacha.',
        tone: 'dark',
      },
      {
        kicker: 'TANLOV VA ISHONCH',
        numberText: mentorCount,
        unitLabel: 'SARALANGAN RAHNAMOLAR',
        description:
          'Har o‘nlab nomzoddan faqat o‘z yo‘lini amalda isbotlagan, xalqaro tajribaga ega mutaxassislar platformaga qabul qilinadi.',
        tone: 'muted',
      },
      {
        kicker: 'ANIQ YO‘NALISH',
        numberText: '1:1',
        unitLabel: 'SHAXSIY YO‘L XARITASI',
        description:
          'Umumiy nazariya emas — 30–45 daqiqalik yuzma-yuz suhbatda aynan sizning holatingiz uchun aniq harakatlar rejasi.',
        tone: 'dark',
      },
      {
        kicker: 'YO‘LCHI YULDUZ',
        numberText: '3',
        unitLabel: 'BOSQICH: GUIDE • GROW • ACHIEVE',
        description:
          'Ustoz toping, aniq reja asosida o‘sing va ko‘zlagan natijangizga ishonch bilan erishing.',
        tone: 'dark',
      },
    ];
  }, [counselors.length, locale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const TOTAL = 1350;

    interface DotParticle {
      // Current interpolated normalized position (-1..1)
      x: number;
      y: number;
      // Target positions for each of the 4 beats
      bx: [number, number, number, number];
      by: [number, number, number, number];
      isHighlight: boolean;
      size: number;
    }

    const clusters = [
      { cx: 0.25, cy: -0.35 },
      { cx: 0.52, cy: -0.1 },
      { cx: -0.1, cy: 0.22 },
      { cx: 0.45, cy: 0.35 },
    ];

    const dots: DotParticle[] = [];
    for (let i = 0; i < TOTAL; i++) {
      // Golden angle disk distribution for Beat 0 (frame_24s.jpg)
      const r0 = Math.sqrt((i + 0.5) / TOTAL) * 0.92;
      const theta0 = i * 2.399963229728653;
      let x0 = r0 * Math.cos(theta0);
      let y0 = r0 * Math.sin(theta0);

      // Pull ~22% of dots toward the 4 oasis clusters just like frame_24s.jpg
      if (i % 5 === 0) {
        const c = clusters[i % clusters.length];
        x0 = c.cx + (x0 - c.cx) * 0.24;
        y0 = c.cy + (y0 - c.cy) * 0.24;
      }

      const isHighlight = i < 55; // First 55 dots are the glowing core mentors in Beat 1 (frame_30s.jpg)

      // Beat 1: 55 highlight dots cluster in the center; others stay in outer cloud
      const r1 = isHighlight ? Math.sqrt((i + 1) / 55) * 0.28 : r0;
      const theta1 = theta0 + 0.4;
      const x1 = r1 * Math.cos(theta1);
      const y1 = r1 * Math.sin(theta1);

      // Beat 2: Twin Silk Road ascending pathways converging toward top
      const pathIdx = i % 2;
      const tPath = (i % 675) / 675; // 0..1
      const spread = isHighlight ? 0.03 : 0.08;
      const x2 =
        (pathIdx === 0 ? -0.45 : 0.15) * (1 - tPath) +
        Math.sin(tPath * Math.PI * 2) * 0.18 +
        ((i % 7) - 3) * spread * 0.25;
      const y2 = 0.78 - tPath * 1.56;

      // Beat 3: 4-Pointed Guiding Star (Yo'lchi Yulduz) astrolabe formation
      const arm = i % 4;
      const armAngle = (arm * Math.PI) / 2;
      const distArm = ((i % 300) / 300) * 0.82;
      const perp = (((i * 13) % 21) - 10) * 0.012 * (1 - distArm * 0.78);
      const x3 = Math.cos(armAngle) * distArm - Math.sin(armAngle) * perp;
      const y3 = Math.sin(armAngle) * distArm + Math.cos(armAngle) * perp;

      dots.push({
        x: x0,
        y: y0,
        bx: [x0, x1, x2, x3],
        by: [y0, y1, y2, y3],
        isHighlight,
        size: isHighlight ? 3.2 : i % 6 === 0 ? 1.8 : 1.25,
      });
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(300, rect.width) * dpr;
      canvas.height = Math.max(300, rect.height) * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    let rot = 0;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.5;
      const R = Math.min(w, h) * 0.44;
      const activeStep = stepRef.current;
      rot += 0.0015;

      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const tx = d.bx[activeStep];
        const ty = d.by[activeStep];

        // Smooth spring-like lerp toward active beat formation
        d.x += (tx - d.x) * 0.065;
        d.y += (ty - d.y) * 0.065;

        const rx = d.x * cosR - d.y * sinR;
        const ry = d.x * sinR + d.y * cosR;

        const sx = cx + rx * R;
        const sy = cy + ry * R;

        ctx.beginPath();
        if (activeStep === 1) {
          // Exact frame_30s.jpg effect: 55 bright orange dots in center, faded gray cloud around
          const radius = d.isHighlight ? 3.4 : 1.1;
          ctx.arc(sx, sy, radius, 0, Math.PI * 2);
          ctx.fillStyle = d.isHighlight
            ? 'rgba(224, 109, 26, 0.96)'
            : 'rgba(160, 165, 170, 0.30)';
        } else if (activeStep === 2) {
          ctx.arc(sx, sy, d.isHighlight ? 2.6 : 1.35, 0, Math.PI * 2);
          ctx.fillStyle = d.isHighlight
            ? 'rgba(15, 76, 92, 0.92)'
            : 'rgba(224, 109, 26, 0.74)';
        } else if (activeStep === 3) {
          ctx.arc(sx, sy, d.isHighlight ? 2.8 : 1.4, 0, Math.PI * 2);
          ctx.fillStyle = d.isHighlight
            ? 'rgba(224, 109, 26, 0.95)'
            : 'rgba(212, 168, 75, 0.78)';
        } else {
          // Beat 0: Full warm orange particle cloud (exact frame_24s.jpg)
          ctx.arc(sx, sy, d.isHighlight ? 2.0 : 1.35, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(224, 109, 26, 0.82)';
        }
        ctx.fill();
      }

      animId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const currentBeat = beats[step] || beats[0];
  const sectionLabel =
    locale === 'ru' ? 'В ЦИФРАХ' : locale === 'en' ? 'IN NUMBERS' : 'RAQAMLARDA';

  return (
    <section className="relative max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* LEFT COLUMN: Editorial Index 02 + Colossal Display Metric + 4-Bar Switcher */}
        <div className="lg:col-span-5">
          <div className="w-px h-14 bg-black/15 mb-5" aria-hidden="true" />

          <div className="flex items-center gap-3 mb-10">
            <span className="font-mono font-bold text-xs text-[#14171A]">02</span>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#8B9298]">
              {sectionLabel}
            </span>
          </div>

          <div className="min-h-[270px] flex flex-col justify-between">
            <div>
              <div className="font-mono font-bold text-xs uppercase tracking-[0.14em] text-[#E06D1A]">
                {currentBeat.kicker}
              </div>

              <div
                className={`font-display font-black text-7xl sm:text-8xl lg:text-[7.2rem] leading-[0.94] tracking-[-0.05em] mt-2 transition-colors duration-500 ${
                  currentBeat.tone === 'muted' ? 'text-[#8B9298]' : 'text-[#14171A]'
                }`}
              >
                {currentBeat.numberText}
              </div>

              <div className="font-mono font-bold text-xs uppercase tracking-[0.12em] text-[#52585C] mt-3">
                {currentBeat.unitLabel}
              </div>

              <p className="mt-5 text-sm sm:text-base text-[#52585C] max-w-md leading-relaxed">
                {currentBeat.description}
              </p>
            </div>

            {/* 4-Step Segmented Progress Switcher (Exact frame_24s.jpg & frame_30s.jpg bottom bars) */}
            <div className="flex items-center gap-2.5 mt-10" role="tablist" aria-label={sectionLabel}>
              {beats.map((b, idx) => {
                const isActive = idx === step;
                return (
                  <button
                    key={b.kicker}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setStep(idx)}
                    className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'w-9 bg-[#E06D1A]'
                        : idx < step
                          ? 'w-7 bg-[#E06D1A]/55 hover:bg-[#E06D1A]'
                          : 'w-7 bg-black/10 hover:bg-black/25'
                    }`}
                    aria-label={b.kicker}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Morphing 1,350-Dot Particle Cloud */}
        <div className="lg:col-span-7 flex items-center justify-center">
          <div
            onClick={() => setStep((prev) => (prev + 1) % 4)}
            title="Click to morph constellation"
            className="relative w-full max-w-[540px] h-[360px] sm:h-[460px] cursor-pointer select-none"
          >
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
        </div>
      </div>
    </section>
  );
}
