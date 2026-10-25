export interface TrackConfig {
  slug: string;
  en: string;
  uz: string;
  ru: string;
  icon: string;
  activeClass: string;
  inactiveClass: string;
}

export const TRACKS: TrackConfig[] = [
  {
    slug: 'it-software',
    en: 'IT & software development',
    uz: 'IT va dasturlash',
    ru: 'IT и разработка ПО',
    icon: '💻',
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
  },
  {
    slug: 'data-ai',
    en: 'Data science & AI',
    uz: "Data science va sun'iy intellekt",
    ru: 'Data Science и ИИ',
    icon: '🧠',
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
  },
  {
    slug: 'finance',
    en: 'Finance, accounting & banking',
    uz: 'Moliya, buxgalteriya va bank',
    ru: 'Финансы, бухгалтерия и банки',
    icon: '📊',
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
  },
  {
    slug: 'marketing-smm',
    en: 'Marketing & SMM',
    uz: 'Marketing va SMM',
    ru: 'Маркетинг и SMM',
    icon: '🚀',
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
  },
  {
    slug: 'business',
    en: 'Business & entrepreneurship',
    uz: 'Biznes va tadbirkorlik',
    ru: 'Бизнес и предпринимательство',
    icon: '💼',
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
  },
  {
    slug: 'study-abroad',
    en: 'Study abroad & scholarships',
    uz: "Chet elda o'qish va grantlar",
    ru: 'Обучение за рубежом и гранты',
    icon: '🎓',
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
  },
  {
    slug: 'trade-logistics',
    en: 'International trade & logistics',
    uz: 'Xalqaro savdo va logistika',
    ru: 'Международная торговля и логистика',
    icon: '🚢',
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
  },
  {
    slug: 'career-start',
    en: 'Career start (CV, interviews, first job)',
    uz: 'Karyera boshlash (CV, intervyu, birinchi ish)',
    ru: 'Старт карьеры (резюме, собеседования, первая работа)',
    icon: '🎯',
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
  },
  {
    slug: 'design-creative',
    en: 'Design & creative (mobile content & video)',
    uz: 'Dizayn va kreativ (mobil kontent va video)',
    ru: 'Дизайн и креатив (мобильный контент и видео)',
    icon: '🎨',
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
  },
  {
    slug: 'other',
    en: 'Other',
    uz: 'Boshqa',
    ru: 'Другое',
    icon: '🧩',
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
  },
];

export const SPECIALTY_CONFIG: {
  [key: string]: { activeClass: string; inactiveClass: string; icon: string };
} = {
  all: {
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
    icon: '✨',
  },
  ...Object.fromEntries(
    TRACKS.map((t) => [
      t.slug,
      {
        activeClass: t.activeClass,
        inactiveClass: t.inactiveClass,
        icon: t.icon,
      },
    ])
  ),
  // Legacy mappings to preserve compatibility with existing database rows
  'Engineering & Tech': {
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
    icon: '💻',
  },
  'Architecture & Design': {
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
    icon: '🏛️',
  },
  'Study Abroad': {
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
    icon: '🎓',
  },
  'Agriculture & Trade': {
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
    icon: '🌾',
  },
  'Medicine & Healthcare': {
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
    icon: '🩺',
  },
  'Law & Legal Practice': {
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
    icon: '⚖️',
  },
  Other: {
    activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
    icon: '🧩',
  },
  Boshqa: {
    activeClass: 'bg-[#0F4F5C] text-white border-[#0F4C5C] shadow-xs',
    inactiveClass: 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0] hover:text-zinc-900',
    icon: '🧩',
  },
};

export function getTrackBySlug(slug: string): TrackConfig | undefined {
  return TRACKS.find((t) => t.slug === slug);
}

export function getTrackLabel(trackOrSlug: string, locale: string = 'uz'): string {
  if (trackOrSlug === 'Other' || trackOrSlug === 'other' || trackOrSlug === 'Boshqa') {
    if (locale === 'ru') return 'Другое';
    if (locale === 'en') return 'Other';
    return 'Boshqa';
  }
  const track = TRACKS.find((t) => t.slug === trackOrSlug || t.en === trackOrSlug || t.uz === trackOrSlug || t.ru === trackOrSlug);
  if (track) {
    if (locale === 'ru') return track.ru;
    if (locale === 'en') return track.en;
    return track.uz;
  }
  return trackOrSlug;
}
