'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AiCareerTools from '@/components/AiCareerTools';
import { useLocale } from 'next-intl';
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Circle,
  Compass,
  Cpu,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  Lock,
  MapPin,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { Counselor } from '@/types';

interface CareerOsHubProps {
  counselors: Counselor[];
  activeGoal?: 'job' | 'internship' | 'study_abroad' | 'startup' | 'switch_career';
}

export type RoadmapTrackId =
  | 'ai_engineer'
  | 'software_engineer'
  | 'product_manager'
  | 'data_scientist'
  | 'ui_ux_designer'
  | 'study_abroad';

interface RoadmapTrack {
  id: RoadmapTrackId;
  title: string;
  badge: string;
  avgTimeline: string;
  specialtyMatch: string;
  requiredSkills: string[];
  milestones: { id: string; title: string; detail: string; defaultDone: boolean }[];
  resources: { title: string; type: string; provider: string }[];
}

export type OpportunityCategory =
  | 'All'
  | 'Internship'
  | 'Job'
  | 'Scholarship'
  | 'Hackathon'
  | 'Fellowship'
  | 'Startup Program';

interface OpportunityItem {
  id: string;
  title: string;
  organization: string;
  category: Exclude<OpportunityCategory, 'All'>;
  location: string;
  deadline: string;
  rewardOrGrant: string;
  tags: string[];
  mentorSpecialty: string;
  url: string;
}

const ROADMAP_TRACKS: RoadmapTrack[] = [
  {
    id: 'ai_engineer',
    title: 'AI Engineer',
    badge: 'HIGH DEMAND • TIER 1',
    avgTimeline: '12–16 Weeks',
    specialtyMatch: 'it-software',
    requiredSkills: ['Python', 'SQL', 'Machine Learning', 'LLM & RAG', 'Docker & APIs'],
    milestones: [
      {
        id: 'ai-1',
        title: 'Python & Data Structures Mastery',
        detail: 'Clean OOP, async pipelines, NumPy/Pandas & algorithmic problem solving.',
        defaultDone: true,
      },
      {
        id: 'ai-2',
        title: 'SQL & Vector Databases',
        detail: 'PostgreSQL, pgvector, indexing, and retrieval pipelines.',
        defaultDone: true,
      },
      {
        id: 'ai-3',
        title: 'ML & Deep Learning Fundamentals',
        detail: 'Supervised learning, transformers, evaluation metrics, and PyTorch.',
        defaultDone: true,
      },
      {
        id: 'ai-4',
        title: 'Production AI / LLM Portfolio Project',
        detail: 'Deploy a full-stack RAG or agentic application with live evaluation metrics.',
        defaultDone: false,
      },
      {
        id: 'ai-5',
        title: '1:1 Mock Interview & Global AI Internship/Offer',
        detail: 'Pass ML system design & coding rounds with a verified AI Rahnamo.',
        defaultDone: false,
      },
    ],
    resources: [
      { title: 'CS229 & Practical Deep Learning Track', type: 'Curriculum', provider: 'Stanford / Fast.ai' },
      { title: 'Production RAG & LLM System Design Guide', type: 'Playbook', provider: 'MyRahnamo Lab' },
      { title: 'Central Asia AI Engineer Resume Template', type: 'Template', provider: 'Verified Mentors' },
    ],
  },
  {
    id: 'software_engineer',
    title: 'Software Engineer',
    badge: 'BIG TECH & UZUM TRACK',
    avgTimeline: '10–14 Weeks',
    specialtyMatch: 'it-software',
    requiredSkills: ['JavaScript/TypeScript', 'Python', 'System Design', 'SQL', 'Git/Linux'],
    milestones: [
      {
        id: 'swe-1',
        title: 'Core Language & Git Engineering Workflow',
        detail: 'TypeScript / Go / Python fundamentals, clean code, and CI/CD.',
        defaultDone: true,
      },
      {
        id: 'swe-2',
        title: 'Data Structures & Algorithms (75 Core Patterns)',
        detail: 'Trees, graphs, dynamic programming, and timed coding drills.',
        defaultDone: true,
      },
      {
        id: 'swe-3',
        title: 'Distributed System Design & Databases',
        detail: 'Caching, queues, sharding, load balancing, and API architecture.',
        defaultDone: false,
      },
      {
        id: 'swe-4',
        title: 'Production Capstone & GitHub Audit',
        detail: '1-on-1 code review and ATS resume optimization with a Senior Architect.',
        defaultDone: false,
      },
      {
        id: 'swe-5',
        title: 'Live Mock Interviews & Referral Submission',
        detail: 'Complete 3 realistic mock interviews for Uzum, EPAM, Yandex, or Big Tech.',
        defaultDone: false,
      },
    ],
    resources: [
      { title: 'System Design Interview Blueprint', type: 'Guide', provider: 'Ex-Google Mentors' },
      { title: 'Top 75 Coding Patterns for Regional & Global Tech', type: 'Practice', provider: 'MyRahnamo OS' },
      { title: 'Engineering CV & LinkedIn Checklist', type: 'Checklist', provider: 'Career Copilot' },
    ],
  },
  {
    id: 'product_manager',
    title: 'Product Manager',
    badge: 'STARTUP & FINTECH',
    avgTimeline: '8–12 Weeks',
    specialtyMatch: 'Architecture & Design',
    requiredSkills: ['Product Strategy', 'SQL', 'Data Analysis', 'Figma/UX', 'User Research'],
    milestones: [
      {
        id: 'pm-1',
        title: 'Product Discovery & User Interview Framework',
        detail: 'Jobs-to-be-Done, customer interviews, and problem framing.',
        defaultDone: true,
      },
      {
        id: 'pm-2',
        title: 'Product Metrics, Unit Economics & SQL',
        detail: 'Retention cohorts, funnel analysis, North Star metrics, and A/B testing.',
        defaultDone: true,
      },
      {
        id: 'pm-3',
        title: 'PRD & Interactive Product Teardown Portfolio',
        detail: 'Write a real Product Requirements Document for a regional fintech/marketplace.',
        defaultDone: false,
      },
      {
        id: 'pm-4',
        title: 'Product Sense & Execution Mock Interview',
        detail: '1-on-1 case simulation with a Senior PM from Uzum / Alif / Big Tech.',
        defaultDone: false,
      },
    ],
    resources: [
      { title: 'Uzum & Kaspi Product Case Study Library', type: 'Case Study', provider: 'MyRahnamo PM Guild' },
      { title: 'PRD & Roadmap Notion Template', type: 'Template', provider: 'Verified PMs' },
    ],
  },
  {
    id: 'data_scientist',
    title: 'Data Scientist',
    badge: 'ANALYTICS & FINTECH',
    avgTimeline: '10–14 Weeks',
    specialtyMatch: 'it-software',
    requiredSkills: ['Python', 'SQL', 'Data Analysis', 'Machine Learning', 'Statistics'],
    milestones: [
      {
        id: 'ds-1',
        title: 'Advanced SQL & Analytical Modeling',
        detail: 'Window functions, cohort retention queries, and data warehousing.',
        defaultDone: true,
      },
      {
        id: 'ds-2',
        title: 'Probability, Statistics & Experimentation',
        detail: 'Hypothesis testing, p-values, causal inference, and A/B test design.',
        defaultDone: true,
      },
      {
        id: 'ds-3',
        title: 'Predictive Modeling & Feature Engineering',
        detail: 'Gradient boosting (XGBoost/LightGBM), churn & credit-scoring models.',
        defaultDone: false,
      },
      {
        id: 'ds-4',
        title: 'Business Impact Portfolio & Case Defense',
        detail: 'Present a real business dataset analysis to a Senior Data Mentor.',
        defaultDone: false,
      },
    ],
    resources: [
      { title: 'FinTech Credit Scoring & Churn Dataset Pack', type: 'Dataset', provider: 'MyRahnamo Data Lab' },
      { title: 'SQL & Product Analytics Interview Prep', type: 'Workbook', provider: 'Senior DS Mentors' },
    ],
  },
  {
    id: 'ui_ux_designer',
    title: 'UI/UX Designer',
    badge: 'DESIGN SYSTEMS & PRODUCT',
    avgTimeline: '8–10 Weeks',
    specialtyMatch: 'Architecture & Design',
    requiredSkills: ['Figma/UX', 'User Research', 'Design Systems', 'Prototyping'],
    milestones: [
      {
        id: 'ux-1',
        title: 'Figma Auto-Layout, Tokens & Component Architecture',
        detail: 'Build scalable design systems and accessible UI tokens.',
        defaultDone: true,
      },
      {
        id: 'ux-2',
        title: 'UX Research, Flows & Information Architecture',
        detail: 'User journey mapping, usability testing, and conversion optimization.',
        defaultDone: true,
      },
      {
        id: 'ux-3',
        title: '2 End-to-End Case Studies (Mobile + SaaS Web)',
        detail: 'Document problem, constraints, iterations, and measurable impact.',
        defaultDone: false,
      },
      {
        id: 'ux-4',
        title: '1:1 Portfolio Critique & Whiteboard Challenge',
        detail: 'Live portfolio review with a Lead Designer / Studio Founder.',
        defaultDone: false,
      },
    ],
    resources: [
      { title: 'Case Study Storytelling Framework', type: 'Template', provider: 'Design Mentors' },
      { title: 'Design System & Token Checklist', type: 'Guide', provider: 'MyRahnamo Studio' },
    ],
  },
  {
    id: 'study_abroad',
    title: 'Study Abroad & 100% Grants',
    badge: 'FULBRIGHT • DAAD • CHEVENING',
    avgTimeline: '12–20 Weeks',
    specialtyMatch: 'Study Abroad',
    requiredSkills: ['IELTS 7.5+', 'Research Writing', 'Personal Statement', 'Academic CV'],
    milestones: [
      {
        id: 'sa-1',
        title: 'IELTS / TOEFL & GRE Target Score Strategy',
        detail: 'Achieve C1 (IELTS 7.5+) and structure your academic timeline.',
        defaultDone: true,
      },
      {
        id: 'sa-2',
        title: 'University & Full-Funding Shortlist (8–10 Programs)',
        detail: 'Match with Fulbright, DAAD, Chevening, Erasmus+, or El-Yurt Umidi.',
        defaultDone: true,
      },
      {
        id: 'sa-3',
        title: 'Personal Statement & Study Objective 1:1 Polish',
        detail: 'Iterate your narrative arc with an alumnus who won the exact grant.',
        defaultDone: false,
      },
      {
        id: 'sa-4',
        title: 'Recommendation Letters & Selection Panel Mock Interview',
        detail: 'Simulate embassy/panel interviews and finalize scholarship submission.',
        defaultDone: false,
      },
    ],
    resources: [
      { title: 'Winning Fulbright & Chevening Essay Structures', type: 'Playbook', provider: 'Scholar Alumni' },
      { title: 'Global Scholarship Deadline Calendar 2026–2027', type: 'Tracker', provider: 'MyRahnamo Hub' },
    ],
  },
];

const CURATED_OPPORTUNITIES: OpportunityItem[] = [
  {
    id: 'opp-1',
    title: 'Fulbright Foreign Student Program',
    organization: 'U.S. Department of State',
    category: 'Scholarship',
    location: 'United States',
    deadline: 'Varies by country',
    rewardOrGrant: 'Tuition, living stipend, travel & health insurance',
    tags: ['Master’s', 'All fields', 'Full funding'],
    mentorSpecialty: 'Study Abroad',
    url: 'https://foreign.fulbrightonline.org/',
  },
  {
    id: 'opp-2',
    title: 'DAAD Scholarships for Study in Germany',
    organization: 'DAAD (German Academic Exchange Service)',
    category: 'Scholarship',
    location: 'Germany',
    deadline: 'Varies by program',
    rewardOrGrant: 'Monthly stipend + health insurance',
    tags: ['Germany', 'Master’s', 'PhD'],
    mentorSpecialty: 'Study Abroad',
    url: 'https://www.daad.de/en/study-and-research-in-germany/scholarships/',
  },
  {
    id: 'opp-3',
    title: 'Chevening Scholarships (Uzbekistan)',
    organization: 'UK Government (FCDO)',
    category: 'Scholarship',
    location: 'United Kingdom',
    deadline: 'Annual cycle',
    rewardOrGrant: 'Fully funded 1-year UK Master’s',
    tags: ['UK', 'Master’s', 'Leadership'],
    mentorSpecialty: 'Study Abroad',
    url: 'https://www.chevening.org/scholarship/uzbekistan/',
  },
  {
    id: 'opp-4',
    title: 'Erasmus Mundus Joint Master’s Degrees',
    organization: 'European Commission',
    category: 'Scholarship',
    location: 'Europe (multi-country)',
    deadline: 'Varies by programme',
    rewardOrGrant: 'Fully funded joint master’s at European universities',
    tags: ['EU', 'Master’s', 'Mobility'],
    mentorSpecialty: 'Study Abroad',
    url: 'https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters',
  },
  {
    id: 'opp-5',
    title: 'El-Yurt Umidi Foundation Programs',
    organization: 'El-Yurt Umidi Foundation',
    category: 'Scholarship',
    location: 'Uzbekistan → Abroad',
    deadline: 'See official site',
    rewardOrGrant: 'State-backed support for study and training abroad',
    tags: ['Uzbekistan', 'Study abroad', 'State program'],
    mentorSpecialty: 'Study Abroad',
    url: 'https://el-yurt.uz/',
  },
  {
    id: 'opp-6',
    title: 'Türkiye Scholarships (Türkiye Bursları)',
    organization: 'Government of Türkiye',
    category: 'Scholarship',
    location: 'Türkiye',
    deadline: 'Annual cycle',
    rewardOrGrant: 'Tuition, housing, monthly stipend',
    tags: ['Türkiye', 'Bachelor’s–PhD', 'Full funding'],
    mentorSpecialty: 'Study Abroad',
    url: 'https://turkiyeburslari.gov.tr/',
  },
  {
    id: 'opp-7',
    title: 'Hubert H. Humphrey Fellowship',
    organization: 'Fulbright / U.S. Department of State',
    category: 'Fellowship',
    location: 'United States',
    deadline: 'Varies by country',
    rewardOrGrant: 'Non-degree professional development year',
    tags: ['Mid-career', 'Policy', 'Leadership'],
    mentorSpecialty: 'Study Abroad',
    url: 'https://www.humphreyfellowship.org/',
  },
  {
    id: 'opp-8',
    title: 'Google Summer of Code',
    organization: 'Google',
    category: 'Internship',
    location: 'Remote (global)',
    deadline: 'Annual cycle',
    rewardOrGrant: 'Paid stipend for open-source work with mentors',
    tags: ['Open source', 'Remote', 'Beginner-friendly'],
    mentorSpecialty: 'it-software',
    url: 'https://summerofcode.withgoogle.com/',
  },
  {
    id: 'opp-9',
    title: 'Online Hackathons',
    organization: 'Devpost',
    category: 'Hackathon',
    location: 'Online (global)',
    deadline: 'Rolling',
    rewardOrGrant: 'Prizes vary by event',
    tags: ['Build', 'Portfolio', 'Teams'],
    mentorSpecialty: 'it-software',
    url: 'https://devpost.com/hackathons',
  },
  {
    id: 'opp-10',
    title: 'Startup School',
    organization: 'Y Combinator',
    category: 'Startup Program',
    location: 'Online',
    deadline: 'Rolling',
    rewardOrGrant: 'Free curriculum and founder community',
    tags: ['Founders', 'Free', 'Online'],
    mentorSpecialty: 'Architecture & Design',
    url: 'https://www.startupschool.org/',
  },
  {
    id: 'opp-11',
    title: 'IT Park Uzbekistan Residency & Programs',
    organization: 'IT Park Uzbekistan',
    category: 'Startup Program',
    location: 'Tashkent',
    deadline: 'Rolling',
    rewardOrGrant: 'Resident benefits and startup support programs',
    tags: ['Uzbekistan', 'Tech', 'Startups'],
    mentorSpecialty: 'it-software',
    url: 'https://it-park.uz/en',
  },
  {
    id: 'opp-12',
    title: 'Astana Hub Startup Programs',
    organization: 'Astana Hub',
    category: 'Startup Program',
    location: 'Astana, Kazakhstan',
    deadline: 'Rolling',
    rewardOrGrant: 'Tech ecosystem, acceleration and events',
    tags: ['Kazakhstan', 'Tech', 'Acceleration'],
    mentorSpecialty: 'it-software',
    url: 'https://astanahub.com/',
  },
  {
    id: 'opp-13',
    title: 'Job Listings in Uzbekistan',
    organization: 'HeadHunter (hh.uz)',
    category: 'Job',
    location: 'Uzbekistan',
    deadline: 'Rolling',
    rewardOrGrant: 'Live vacancies across industries',
    tags: ['Local market', 'All fields'],
    mentorSpecialty: 'it-software',
    url: 'https://hh.uz/',
  },
];

const ALL_SKILL_CHIPS = [
  'Python',
  'JavaScript/TypeScript',
  'SQL',
  'Machine Learning',
  'System Design',
  'Figma/UX',
  'Product Strategy',
  'Data Analysis',
  'IELTS 7.5+',
  'Research Writing',
  'Git/Linux',
];

export default function CareerOsHub({ counselors }: CareerOsHubProps) {
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState<'roadmaps' | 'ai_copilot' | 'ai_tools' | 'opportunities'>(
    'roadmaps'
  );
  const [selectedTrackId, setSelectedTrackId] = useState<RoadmapTrackId>('ai_engineer');
  const [completedMilestoneIds, setCompletedMilestoneIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const track of ROADMAP_TRACKS) {
      for (const m of track.milestones) {
        if (m.defaultDone) initial[m.id] = true;
      }
    }
    return initial;
  });

  // AI Career Advisor state
  const [degreeInput, setDegreeInput] = useState<string>('Computer Science (TUIT / INHA / WIUT)');
  const [userSkills, setUserSkills] = useState<string[]>(['Python', 'SQL', 'Git/Linux']);
  const [showProModal, setShowProModal] = useState<boolean>(false);

  // Opportunity Hub state
  const [oppCategory, setOppCategory] = useState<OpportunityCategory>('All');
  const [oppSearch, setOppSearch] = useState<string>('');

  // Sync activeTab with URL hash (#roadmaps, #ai-copilot, #imkoniyatlar, #opportunities)
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash;
      if (hash === '#ai-copilot') {
        setActiveTab('ai_copilot');
      } else if (hash === '#imkoniyatlar' || hash === '#opportunities') {
        setActiveTab('opportunities');
      } else if (hash === '#roadmaps') {
        setActiveTab('roadmaps');
      }
    };
    const onCustomTab = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'roadmaps' || detail === 'ai_copilot' || detail === 'ai_tools' || detail === 'opportunities') {
        setActiveTab(detail);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('rahnamo:tab', onCustomTab);
    return () => {
      window.removeEventListener('hashchange', syncFromHash);
      window.removeEventListener('rahnamo:tab', onCustomTab);
    };
  }, []);

  // Load persisted milestone state from localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('rahnamo_roadmap_milestones_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setCompletedMilestoneIds((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleMilestone = (id: string) => {
    setCompletedMilestoneIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem('rahnamo_roadmap_milestones_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleUserSkill = (skill: string) => {
    setUserSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const currentTrack = useMemo(
    () => ROADMAP_TRACKS.find((t) => t.id === selectedTrackId) || ROADMAP_TRACKS[0],
    [selectedTrackId]
  );

  // Calculate live progress % and next task for the selected roadmap track
  const trackProgress = useMemo(() => {
    const total = currentTrack.milestones.length;
    const done = currentTrack.milestones.filter((m) => completedMilestoneIds[m.id]).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const nextTask =
      currentTrack.milestones.find((m) => !completedMilestoneIds[m.id])?.title ||
      'Book Final 1:1 Mock Interview with Rahnamo';
    return { total, done, pct, nextTask };
  }, [completedMilestoneIds, currentTrack]);

  // Calculate AI Career Score & Skill Gaps (Page 11 & 14 of Master Plan)
  const aiEvaluation = useMemo(() => {
    const req = currentTrack.requiredSkills;
    const matched = req.filter((s) => userSkills.includes(s));
    const missing = req.filter((s) => !userSkills.includes(s));
    const skillReadiness = Math.min(
      98,
      Math.max(42, Math.round((matched.length / Math.max(1, req.length)) * 70 + trackProgress.pct * 0.28))
    );
    const resumeScore = Math.min(96, 64 + userSkills.length * 4);
    const linkedinScore = Math.min(95, 60 + matched.length * 6);
    const portfolioScore = Math.min(98, 52 + trackProgress.done * 10);

    return {
      matched,
      missing,
      skillReadiness,
      resumeScore,
      linkedinScore,
      portfolioScore,
    };
  }, [currentTrack.requiredSkills, trackProgress.done, trackProgress.pct, userSkills]);

  // Match mentors for the selected track
  const recommendedMentors = useMemo(() => {
    const matches = counselors.filter((c) =>
      c.specialties.includes(currentTrack.specialtyMatch)
    );
    return (matches.length > 0 ? matches : counselors).slice(0, 2);
  }, [counselors, currentTrack.specialtyMatch]);

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    return CURATED_OPPORTUNITIES.filter((item) => {
      const catOk = oppCategory === 'All' || item.category === oppCategory;
      const q = oppSearch.trim().toLowerCase();
      const searchOk =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.organization.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return catOk && searchOk;
    });
  }, [oppCategory, oppSearch]);

  const headings = {
    badge:
      locale === 'ru'
        ? 'CAREER OPERATING SYSTEM • ТЕЗИС MASTER PLAN'
        : locale === 'en'
          ? 'CAREER OPERATING SYSTEM • MASTER PLAN ENGINE'
          : 'CAREER OPERATING SYSTEM • MASTER PLAN EKOTIZIMI',
    title:
      locale === 'ru'
        ? 'Менторство — точка входа. Карьерный рост — продукт.'
        : locale === 'en'
          ? 'Mentorship is the entry point. Career growth is the product.'
          : 'Mentorlik — boshlanish nuqtasi. Karyera o‘sishi — asosiy mahsulot.',
    subtitle:
      locale === 'ru'
        ? 'Проверяйте прогресс по дорожным картам, находите пробелы в навыках с AI Career Copilot и откликайтесь на стажировки и гранты.'
        : locale === 'en'
          ? 'Track checkable career roadmaps, diagnose skill gaps with the AI Career Advisor, and unlock curated scholarships and internships across Central Asia.'
          : 'Aniq yo‘l xaritalari bo‘yicha qadamma-qadam o‘sing, AI Career Advisor orqali ko‘nikmalaringizni tahlil qiling va xalqaro grant hamda stajirovkalarga ulaning.',
    tabRoadmaps:
      locale === 'ru'
        ? '1. Дорожные карты и Трекер'
        : locale === 'en'
          ? '1. Career Roadmaps & Tracker'
          : '1. Yo‘l Xaritalari va Progress',
    tabAi:
      locale === 'ru'
        ? '2. AI Career Advisor & Score'
        : locale === 'en'
          ? '2. AI Career Advisor & Score'
          : '2. AI Career Advisor va Tahlil',
    tabOpps:
      locale === 'ru'
        ? '3. Хаб возможностей (Гранты и Стажировки)'
        : locale === 'en'
          ? '3. Opportunity Hub (Grants & Internships)'
          : '3. Imkoniyatlar Markazi (Grant va Stajirovka)',
  };

  return (
    <section
      id="roadmaps"
      className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6 sm:pb-8 scroll-mt-20"
    >
      {/* Top Section Header + Master Plan Core Thesis */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-5 sm:mb-6">
        <div className="max-w-2xl">
          <span className="eyebrow-pill">
            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
            <span>{headings.badge}</span>
          </span>
          <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-[#0F1E36] tracking-[-0.035em] leading-[1.06] mt-4">
            {headings.title}
          </h2>
          <p className="text-sm sm:text-base text-[#475569] mt-3 leading-relaxed">
            {headings.subtitle}
          </p>
        </div>

        {/* Career Operating System Live Status Bar (Page 14 — "15. Career Operating System Dashboard") */}
        <div className="rounded-2xl bg-[#0F1E36] text-white p-4 sm:p-5 border border-[#F59E0B]/35 shadow-lg min-w-[300px] sm:min-w-[360px]">
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[#F59E0B]">
            <span>★ CAREER OS LIVE STATUS</span>
            <span>{trackProgress.pct}% COMPLETE</span>
          </div>
          <div className="font-display font-bold text-sm sm:text-base text-white mt-1.5 flex items-center justify-between">
            <span>Goal: Become {currentTrack.title}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#C25E38] transition-all duration-500"
              style={{ width: `${trackProgress.pct}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-300">
            <span className="truncate pr-2">
              <strong className="text-amber-300">Next:</strong> {trackProgress.nextTask}
            </span>
            <span className="shrink-0 font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#C25E38]/30 text-amber-200">
              {CURATED_OPPORTUNITIES.length} Opps
            </span>
          </div>
        </div>
      </div>

      {/* 3-Pillar Navigation Tabs */}
      <div id="ai-copilot" className="scroll-mt-24" />
      <div id="imkoniyatlar" className="scroll-mt-24" />
      <div
        className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white border border-[#0F1E36]/10 shadow-xs mb-8"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'roadmaps'}
          onClick={() => setActiveTab('roadmaps')}
          className={`flex-1 min-w-[210px] inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'roadmaps'
              ? 'bg-[#0F1E36] text-white shadow-sm'
              : 'text-[#475569] hover:text-[#0F1E36] hover:bg-[#FBF9F5]'
          }`}
        >
          <Layers className="w-4 h-4 text-[#F59E0B]" />
          <span>{headings.tabRoadmaps}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ai_copilot'}
          onClick={() => setActiveTab('ai_copilot')}
          className={`flex-1 min-w-[210px] inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'ai_copilot'
              ? 'bg-[#0F1E36] text-white shadow-sm'
              : 'text-[#475569] hover:text-[#0F1E36] hover:bg-[#FBF9F5]'
          }`}
        >
          <Cpu className="w-4 h-4 text-[#F59E0B]" />
          <span>{headings.tabAi}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ai_tools'}
          onClick={() => setActiveTab('ai_tools')}
          className={`flex-1 min-w-[210px] inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'ai_tools'
              ? 'bg-[#0F1E36] text-white shadow-sm'
              : 'text-[#475569] hover:text-[#0F1E36] hover:bg-[#FBF9F5]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#F59E0B]" />
          <span>Free AI Resume & Roadmap Tools</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'opportunities'}
          onClick={() => setActiveTab('opportunities')}
          className={`flex-1 min-w-[210px] inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-display font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'opportunities'
              ? 'bg-[#0F1E36] text-white shadow-sm'
              : 'text-[#475569] hover:text-[#0F1E36] hover:bg-[#FBF9F5]'
          }`}
        >
          <Rocket className="w-4 h-4 text-[#F59E0B]" />
          <span>{headings.tabOpps}</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: STRUCTURED CAREER ROADMAPS & INTERACTIVE PROGRESS TRACKER
          ===================================================================== */}
      {activeTab === 'roadmaps' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left Column (4 Cols): 6 Master Plan Career Track Selector */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="text-xs font-mono font-bold uppercase tracking-[0.14em] text-[#64748B] px-1 mb-2">
              SELECT TARGET CAREER TRACK (6 PATHS)
            </div>
            {ROADMAP_TRACKS.map((track, idx) => {
              const isSelected = track.id === selectedTrackId;
              const doneCount = track.milestones.filter((m) => completedMilestoneIds[m.id]).length;
              const pct = Math.round((doneCount / track.milestones.length) * 100);

              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => setSelectedTrackId(track.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-[#0F1E36] text-white border-[#0F1E36] shadow-md'
                      : 'bg-white hover:bg-[#FBF9F5] text-[#0F1E36] border-[#0F1E36]/10 hover:border-[#F59E0B]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-[#F59E0B] text-[#0F1E36]'
                            : 'bg-[#0F1E36]/[0.06] text-[#0F1E36]'
                        }`}
                      >
                        0{idx + 1}
                      </span>
                      <span className="font-display font-bold text-sm sm:text-base truncate">
                        {track.title}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        isSelected ? 'text-[#F59E0B]' : 'text-[#D97706]'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Left Column Quick Trust / Mentor Tip Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-[#FBF9F5] border border-[#0F1E36]/10 shadow-xs">
              <div className="flex items-center gap-2 font-display font-bold text-xs text-[#0F1E36]">
                <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                <span>1-ga-1 Mentor bilan 2x tezroq</span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                Ushbu yo‘l xaritasi bo‘yicha tajribali mutaxassis bilan suhbat qiling va xatolardan qoching.
              </p>
              <a
                href="#rahnamolar"
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#C25E38] hover:text-[#0F1E36] transition-colors"
              >
                <span>Mos Rahnamoni tanlash</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Column (8 Cols): Checkable Milestones + Curated Resources + Recommended Mentors */}
          <div className="lg:col-span-8 yv-card">
            <div className="yv-card-inner p-5 sm:p-6 relative overflow-hidden">
              <div className="uzc-dot-corner" aria-hidden="true" />

              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#0F1E36]/10 relative z-10">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#C25E38]">
                    <span>{currentTrack.badge}</span>
                    <span>•</span>
                    <span>{currentTrack.avgTimeline}</span>
                  </span>
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F1E36] mt-1">
                    Goal: {currentTrack.title} Roadmap
                  </h3>
                </div>

                <div className="bg-[#FBF9F5] border border-[#F59E0B]/40 rounded-2xl px-4 py-2.5 text-right">
                  <div className="font-mono font-extrabold text-2xl text-[#0F1E36] leading-none">
                    {trackProgress.pct}%
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] mt-1">
                    {trackProgress.done} OF {trackProgress.total} COMPLETED
                  </div>
                </div>
              </div>

              {/* Interactive Checkable Milestones (Click to toggle ✓ / ✗) */}
              <div className="mt-5 space-y-2.5 relative z-10">
                <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-[#64748B]">
                  <span>CHECKABLE MILESTONES (CLICK TO UPDATE PROGRESS)</span>
                  <span className="text-[#D97706]">INTERACTIVE TRACKER</span>
                </div>

                {currentTrack.milestones.map((m, idx) => {
                  const isDone = Boolean(completedMilestoneIds[m.id]);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMilestone(m.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                        isDone
                          ? 'bg-emerald-50/60 border-emerald-300/70 text-[#0F1E36]'
                          : 'bg-[#FBF9F5] hover:bg-white border-[#0F1E36]/10 text-[#0F1E36]'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 shrink-0">
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#94A3B8]" />
                          )}
                        </div>
                        <div>
                          <div className="font-display font-bold text-sm sm:text-base flex items-center gap-2">
                            <span className="font-mono text-xs text-[#D97706]">0{idx + 1}</span>
                            <span className={isDone ? 'line-through opacity-80' : ''}>
                              {m.title}
                            </span>
                          </div>
                          <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                            {m.detail}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#0F1E36]/[0.07] text-[#475569]'
                        }`}
                      >
                        {isDone ? 'DONE ✓' : 'TO DO'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Curated Resources + Recommended Mentors for this Roadmap */}
              <div className="mt-7 pt-6 border-t border-[#0F1E36]/10 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-[0.14em] text-[#0F1E36] mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>CURATED TRACK RESOURCES</span>
                  </h4>
                  <div className="space-y-2">
                    {currentTrack.resources.map((res) => (
                      <div
                        key={res.title}
                        className="p-3 rounded-xl bg-[#FBF9F5] border border-[#0F1E36]/10 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#0F1E36] truncate">
                            {res.title}
                          </div>
                          <div className="text-[11px] text-[#64748B]">{res.provider}</div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#F59E0B]/20 text-[#92400E] shrink-0">
                          {res.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-[0.14em] text-[#0F1E36] mb-3 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>RECOMMENDED RAHNAMOS FOR THIS TRACK</span>
                  </h4>
                  <div className="space-y-2.5">
                    {recommendedMentors.map((mentor) => (
                      <Link
                        key={mentor.id}
                        href={`/counselors/${mentor.id}`}
                        className="p-3 rounded-xl bg-[#FBF9F5] hover:bg-white border border-[#0F1E36]/10 hover:border-[#F59E0B] flex items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Image
                            src={mentor.avatarUrl}
                            alt={mentor.fullName}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-xl object-cover border border-[#F59E0B]/50 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-display font-bold text-xs text-[#0F1E36] truncate">
                              {mentor.fullName}
                            </div>
                            <div className="text-[11px] text-[#C25E38] font-semibold truncate">
                              {mentor.company || mentor.headline}
                            </div>
                          </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-[#0F1E36] shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: AI CAREER ADVISOR & AI CAREER SCORE (Page 5, 11, 14)
          ===================================================================== */}
      {activeTab === 'ai_copilot' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
          {/* Left Column (5 Cols): Degree, Target Role & Current Skills Input */}
          <div className="lg:col-span-5 yv-card">
            <div className="yv-card-inner p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#C25E38]">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>AI CAREER ADVISOR INPUTS</span>
                  </span>
                  <h3 className="font-display font-extrabold text-2xl text-[#0F1E36] mt-1">
                    Diagnose Your Skill Gaps
                  </h3>
                  <p className="text-xs text-[#475569] mt-1">
                    Enter your academic background, current skills, and target role to compute your live AI Career Score.
                  </p>
                </div>

                {/* 1. Degree / University Input */}
                <div>
                  <label className="block text-xs font-bold text-[#0F1E36] mb-1.5">
                    1. Your Degree / Background
                  </label>
                  <select
                    value={degreeInput}
                    onChange={(e) => setDegreeInput(e.target.value)}
                    className="w-full rounded-xl border border-[#0F1E36]/15 bg-[#FBF9F5] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#0F1E36] outline-none focus:border-[#D97706]"
                  >
                    <option>Computer Science & IT (TUIT / INHA / NewUU)</option>
                    <option>Economics, Business & FinTech (WIUT / TSUE)</option>
                    <option>Medicine & Clinical Sciences (TMA / SamMU)</option>
                    <option>International Law & Public Policy (TSUL / UWED)</option>
                    <option>Architecture, Design & Creative Arts</option>
                    <option>Self-Taught / Career Switcher</option>
                  </select>
                </div>

                {/* 2. Target Role Input */}
                <div>
                  <label className="block text-xs font-bold text-[#0F1E36] mb-1.5">
                    2. Target Career Role
                  </label>
                  <select
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value as RoadmapTrackId)}
                    className="w-full rounded-xl border border-[#0F1E36]/15 bg-[#FBF9F5] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#0F1E36] outline-none focus:border-[#D97706]"
                  >
                    {ROADMAP_TRACKS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.avgTimeline})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Current Skills Multi-Select Chips */}
                <div>
                  <label className="block text-xs font-bold text-[#0F1E36] mb-2">
                    3. Toggle Your Current Skills ({userSkills.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SKILL_CHIPS.map((skill) => {
                      const active = userSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleUserSkill(skill)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                            active
                              ? 'bg-[#0F1E36] text-[#F59E0B] border-[#0F1E36]'
                              : 'bg-[#FBF9F5] text-[#475569] border-[#0F1E36]/12 hover:border-[#D97706]'
                          }`}
                        >
                          {active ? `✓ ${skill}` : `+ ${skill}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#0F1E36]/10 flex items-center justify-between">
                <Link
                  href="/match"
                  className="btn-yv-primary w-full justify-between !text-xs"
                >
                  <span>Full 4-Step Mentor Match Quiz</span>
                  <span className="badge !w-8 !h-8" aria-hidden="true">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column (7 Cols): AI Career Score + Skill Gaps + Stage 2 Subscription Gate */}
          <div className="lg:col-span-7 rounded-3xl bg-[#0F1E36] text-white p-6 sm:p-8 border border-[#F59E0B]/35 shadow-2xl flex flex-col justify-between relative overflow-hidden neo-silk-tessellation-dark">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#F59E0B]">
                    ★ TIER 4 MOAT • AI CAREER SCORE
                  </span>
                  <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white mt-0.5">
                    {currentTrack.title} Readiness Report
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#C25E38]/30 border border-[#C25E38]/50 text-amber-200 font-mono text-xs font-bold">
                  {degreeInput.split('(')[0].trim()}
                </span>
              </div>

              {/* 4-Metric AI Career Score Grid (Page 14: Resume, LinkedIn, Portfolio, Skill Readiness) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                {[
                  { label: 'Resume Score', val: aiEvaluation.resumeScore, suffix: '/100' },
                  { label: 'LinkedIn Score', val: aiEvaluation.linkedinScore, suffix: '/100' },
                  { label: 'Portfolio Score', val: aiEvaluation.portfolioScore, suffix: '/100' },
                  { label: 'Skill Readiness', val: aiEvaluation.skillReadiness, suffix: '%' },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5"
                  >
                    <div className="font-mono font-extrabold text-2xl text-[#F59E0B]">
                      {metric.val}
                      <span className="text-xs text-slate-400 font-normal">{metric.suffix}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-200 mt-1">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Verified Skills vs. Missing Skill Gaps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2.5">
                    ✓ VERIFIED SKILLS FOR ROLE ({aiEvaluation.matched.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {aiEvaluation.matched.length > 0 ? (
                      aiEvaluation.matched.map((s) => (
                        <span
                          key={s}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-bold"
                        >
                          ✓ {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">
                        Select matching skills on the left to increase your readiness score.
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F59E0B] mb-2.5">
                    ✗ PRIORITY SKILL GAPS TO CLOSE ({aiEvaluation.missing.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {aiEvaluation.missing.length > 0 ? (
                      aiEvaluation.missing.map((s) => (
                        <span
                          key={s}
                          className="px-2.5 py-1 rounded-lg bg-[#C25E38]/25 border border-[#C25E38]/50 text-amber-200 text-xs font-bold"
                        >
                          ✗ {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-300 font-semibold">
                        All core skills matched! Ready for 1:1 Mock Interview.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stage 2 Monetization Gate Banner (Page 7: Subscription $5–$10/month for AI Resume Review & Interview Simulator) */}
            <div className="mt-6 rounded-2xl bg-gradient-to-r from-[#F59E0B]/20 via-[#C25E38]/20 to-white/[0.05] border border-[#F59E0B]/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#F59E0B]">
                  <Lock className="w-3 h-3" />
                  <span>FREE AI TOOLS • NO SIGN-UP</span>
                </div>
                <h4 className="font-display font-bold text-sm sm:text-base text-white">
                  Free AI Resume Checker + Roadmap Maker & Tracker
                </h4>
                <p className="text-xs text-slate-300">
                  Paste your CV for an instant ATS score, or generate a week-by-week plan and track it.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('ai_tools')}
                className="shrink-0 inline-flex items-center gap-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#0F1E36] font-extrabold text-xs px-5 py-3 rounded-full hover:brightness-105 transition-all cursor-pointer shadow-md"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Open Free Tools →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: REGIONAL OPPORTUNITY HUB (Internships, Scholarships, Hackathons)
          ===================================================================== */}
      {activeTab === 'ai_tools' && <AiCareerTools />}

      {activeTab === 'opportunities' && (
        <div className="space-y-6">
          {/* Search & Category Filter Bar */}
          <div className="rounded-3xl bg-white p-5 sm:p-6 border border-[#0F1E36]/10 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(
                [
                  'All',
                  'Internship',
                  'Scholarship',
                  'Fellowship',
                  'Startup Program',
                  'Hackathon',
                  'Job',
                ] as OpportunityCategory[]
              ).map((cat) => {
                const active = oppCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setOppCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? 'bg-[#0F1E36] text-[#F59E0B] shadow-2xs'
                        : 'bg-[#FBF9F5] text-[#475569] border border-[#0F1E36]/10 hover:border-[#F59E0B]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={oppSearch}
                onChange={(e) => setOppSearch(e.target.value)}
                placeholder="Search Fulbright, DAAD, Chevening, hackathon..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#FBF9F5] border border-[#0F1E36]/12 text-xs text-[#0F1E36] outline-none focus:border-[#D97706]"
              />
            </div>
          </div>

          {/* Opportunities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredOpportunities.map((opp) => (
              <div key={opp.id} className="yv-card h-full">
                <div className="yv-card-inner p-6 flex flex-col justify-between h-full relative overflow-hidden">
                  <div className="uzc-dot-corner !w-20 !h-20" aria-hidden="true" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-[#0F1E36] text-[#F59E0B] text-[10px] font-mono font-bold uppercase">
                        {opp.category}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-[#C25E38]">
                        Deadline: {opp.deadline}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-base sm:text-lg text-[#0F1E36] mt-3.5 leading-snug">
                      {opp.title}
                    </h3>
                    <p className="text-xs font-bold text-[#475569] mt-1">{opp.organization}</p>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mt-2">
                      <MapPin className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                      <span>{opp.location}</span>
                    </div>

                    <div className="mt-3 p-2.5 rounded-xl bg-[#FBF9F5] border border-[#F59E0B]/35 text-xs font-bold text-[#0F1E36] flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                      <span className="truncate">{opp.rewardOrGrant}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {opp.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#0F1E36]/[0.05] text-[#475569]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-[#0F1E36]/10 flex items-center justify-between gap-3 relative z-10">
                    <a href={opp.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#0F1E36] hover:text-[#D97706] inline-flex items-center gap-1.5">
                      <span>Official site</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#C25E38]" />
                    </a>
                    <a href="#rahnamolar" className="text-xs font-bold text-[#475569] hover:text-[#D97706] inline-flex items-center gap-1">
                      <span>Prepare with a Rahnamo</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#C25E38]" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage 2 Subscription Preview Modal ($7/month Pro Tier) */}
      {showProModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0F1E36]/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-3xl bg-[#0F1E36] text-white p-7 sm:p-8 border border-[#F59E0B]/40 shadow-2xl relative overflow-hidden neo-silk-tessellation-dark">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#F59E0B]">
                <Sparkles className="w-4 h-4" />
                <span>STAGE 2 • MYRAHNAMO PRO COPILOT</span>
              </span>
              <button
                type="button"
                onClick={() => setShowProModal(false)}
                className="text-xs font-bold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white mt-4">
              Accelerate Your Career Outcomes 24/7
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Complement your 1-on-1 mentorship sessions with unlimited AI Resume Reviews, Interview Simulations, and Priority Grant Matching.
            </p>

            <div className="mt-5 p-4 rounded-2xl bg-white/[0.06] border border-[#F59E0B]/30 flex items-baseline justify-between">
              <div>
                <div className="font-display font-extrabold text-3xl text-[#F59E0B]">
                  $7 <span className="text-sm font-normal text-slate-300">/ month</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Or 89,000 UZS / month via Click • Free for students during Beta
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                BETA EARLY ACCESS
              </span>
            </div>

            <ul className="mt-5 space-y-2.5 text-xs sm:text-sm text-slate-200">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>Line-by-line ATS Resume & LinkedIn Profile Scoring</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>Interactive AI Technical & Scholarship Interview Simulator</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>Instant Alerts for Fulbright, DAAD, Chevening & Uzum Internships</span>
              </li>
            </ul>

            <div className="mt-7 flex flex-col sm:flex-row items-center gap-3">
              <a
                href="#early-access"
                onClick={() => setShowProModal(false)}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#0F1E36] font-extrabold text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-md"
              >
                <span>Join Free Beta Waitlist</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
              <Link
                href="/match"
                onClick={() => setShowProModal(false)}
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold text-white"
              >
                Match with a Mentor
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
