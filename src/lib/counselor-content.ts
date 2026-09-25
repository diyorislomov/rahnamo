import type { Counselor } from '@/types';

type Content = { headline: string; bio: string; help: string; company?: string };
type Language = 'uz' | 'ru' | 'en';
const language = (locale: string): Language => locale.startsWith('uz') ? 'uz' : locale.startsWith('ru') ? 'ru' : 'en';

// Only the explicitly labelled sample catalogue uses this editorial content.
// Real mentor records retain their own descriptions, prices and availability.
const samples: Record<string, Record<Language, Content>> = {
  c1: {
    uz: { headline: 'Kardiolog · xorijda ordinatura bo‘yicha ustoz', help: 'Tibbiy yo‘nalish va xorijdagi ordinaturani tanlashda yordam beradi.', bio: 'Tibbiyot talabalari va yosh shifokorlarga xorijdagi ordinatura imtihonlari, litsenziya olish yo‘li va mutaxassislik tanlash bo‘yicha maslahat beradi.', company: 'Anqara shifoxonasining sobiq mutaxassisi' },
    ru: { headline: 'Кардиолог · наставник по зарубежной ординатуре', help: 'Помогает выбрать медицинскую специальность и ординатуру за рубежом.', bio: 'Консультирует студентов-медиков и молодых врачей по поступлению в ординатуру за рубежом, лицензированию и выбору специальности.', company: 'Бывший специалист больницы Анкары' },
    en: { headline: 'Cardiologist · medical residency mentor', help: 'Helps you choose a medical specialty and plan residency abroad.', bio: 'Guides medical students and young doctors through residency exams abroad, licensing pathways and choosing a medical specialty.', company: 'Former Ankara Hospital specialist' },
  },
  c2: {
    uz: { headline: 'Arxitektor · interyer dizayneri', help: 'Portfolioni yaxshilash va dastlabki mijozlarni topishda yordam beradi.', bio: 'Markaziy Osiyoda turar joy va tijorat binolarini loyihalash bo‘yicha 8 yildan ortiq tajriba. Talabalar portfoliosini ko‘rib chiqadi va mijoz topish bo‘yicha maslahat beradi.' },
    ru: { headline: 'Архитектор · дизайнер интерьеров', help: 'Помогает улучшить портфолио и найти первых клиентов.', bio: 'Более 8 лет проектирует жилые и коммерческие пространства в Центральной Азии. Разбирает студенческие портфолио и консультирует по поиску клиентов.' },
    en: { headline: 'Architect · interior designer', help: 'Helps you improve your portfolio and find your first clients.', bio: 'Over 8 years designing residential and commercial spaces across Central Asia. Reviews student portfolios and advises on finding clients.' },
  },
  c3: {
    uz: { headline: 'Korporativ huquqshunos · LL.M. bitiruvchisi', help: 'Xorijiy magistratura va huquqshunoslikdagi karyerani rejalashga yordam beradi.', bio: 'Huquq talabalari bilan xorijiy magistraturaga hujjat topshirish, malaka imtihonlariga tayyorlanish va Toshkentda korporativ huquq sohasida ishlash yo‘llarini muhokama qiladi.', company: 'Leyden universiteti LL.M. bitiruvchisi' },
    ru: { headline: 'Корпоративный юрист · выпускник LL.M.', help: 'Помогает спланировать зарубежную магистратуру и юридическую карьеру.', bio: 'Консультирует студентов-юристов по поступлению в зарубежную магистратуру, подготовке к квалификационным экзаменам и карьере в корпоративном праве в Ташкенте.', company: 'Выпускник LL.M. Лейденского университета' },
    en: { headline: 'Corporate lawyer · LL.M. graduate', help: 'Helps you plan international postgraduate study and a legal career.', bio: 'Advises law students on international master’s applications, professional exams and building a corporate legal career in Tashkent.', company: 'Leiden University LL.M. graduate' },
  },
  c4: {
    uz: { headline: 'Fulbright bitiruvchisi · grantlar bo‘yicha ustoz', help: 'Grant dasturini tanlash va motivatsion xat tayyorlashga yordam beradi.', bio: 'AQSh, Yevropa va Osiyodagi magistratura grantlariga hujjat tayyorlash bo‘yicha maslahat beradi. Motivatsion xat va shaxsiy bayonotni yaxshilash ustida ishlaydi.', company: 'Fulbright dasturi bitiruvchisi' },
    ru: { headline: 'Выпускница Fulbright · наставник по стипендиям', help: 'Помогает выбрать стипендию и подготовить мотивационное письмо.', bio: 'Консультирует по заявкам на стипендии для магистратуры в США, Европе и Азии. Помогает улучшить мотивационное письмо и личное эссе.', company: 'Выпускница программы Fulbright' },
    en: { headline: 'Fulbright alumna · scholarship mentor', help: 'Helps you choose scholarships and prepare your personal statement.', bio: 'Advises on postgraduate scholarship applications in the US, Europe and Asia, with a focus on personal statements and application essays.', company: 'Fulbright alumna' },
  },
  c5: {
    uz: { headline: 'Agrobiznes va eksport bo‘yicha maslahatchi', help: 'Agrobiznesni boshlash va eksport jarayonini tushunishga yordam beradi.', bio: 'Yosh tadbirkorlarga qishloq xo‘jaligi ta’minot zanjirlari, oziq-ovqatni qayta ishlash, eksport talablari va hududiy biznesni boshlash bo‘yicha maslahat beradi.' },
    ru: { headline: 'Консультант по агробизнесу и экспорту', help: 'Помогает разобраться в запуске агробизнеса и организации экспорта.', bio: 'Консультирует молодых предпринимателей по аграрным цепочкам поставок, переработке продуктов, требованиям к экспорту и запуску регионального бизнеса.' },
    en: { headline: 'Agribusiness and export advisor', help: 'Helps you understand starting an agricultural business and exporting.', bio: 'Advises young entrepreneurs on agricultural supply chains, food processing, export requirements and starting regional businesses.' },
  },
  c6: {
    uz: { headline: 'Dasturiy tizimlar arxitektori · IT ustoz', help: 'IT suhbatiga tayyorlanish va dasturchi sifatida o‘sishga yordam beradi.', bio: 'Yirik taqsimlangan dasturiy tizimlar bilan 10 yildan ortiq tajriba. Dasturchilarga kasbiy o‘sish, tizimlarni loyihalash va xalqaro ish suhbatlariga tayyorlanish bo‘yicha yordam beradi.', company: 'Sobiq katta dasturiy tizimlar arxitektori' },
    ru: { headline: 'Архитектор ПО · наставник в IT', help: 'Помогает подготовиться к IT-собеседованию и вырасти как разработчик.', bio: 'Более 10 лет работает с крупными распределёнными системами. Помогает разработчикам с профессиональным ростом, проектированием систем и подготовкой к международным собеседованиям.', company: 'Бывший старший архитектор ПО' },
    en: { headline: 'Software architect · technology mentor', help: 'Helps you prepare for technical interviews and grow as a developer.', bio: 'Over 10 years working with large distributed systems. Supports developers with career growth, system design and preparation for international technical interviews.', company: 'Former senior software architect' },
  },
};

export function getCounselorContent(counselor: Counselor, locale: string, demo = false): Content {
  const content = demo ? samples[counselor.id]?.[language(locale)] : undefined;
  return content ? { ...content, company: content.company || counselor.company } : {
    headline: counselor.headline, bio: counselor.bio,
    help: counselor.whyWorkWithMe?.trim() || counselor.bio, company: counselor.company,
  };
}

const specialtyLabels: Record<string, [string, string]> = {
  'Medicine & Healthcare': ['Tibbiyot va salomatlik', 'Медицина и здоровье'],
  'Architecture & Design': ['Arxitektura va dizayn', 'Архитектура и дизайн'],
  'Law & Legal Practice': ['Huquqshunoslik', 'Юриспруденция'],
  'Study Abroad': ['Xalqaro grantlar', 'Обучение за рубежом'],
  'Agriculture & Trade': ['Qishloq xo‘jaligi va eksport', 'Сельское хозяйство и экспорт'],
  'Engineering & Tech': ['Dasturlash va IT', 'Программирование и IT'],
  Other: ['Boshqa', 'Другое'],
  'Residency in Turkey & Germany': ['Turkiya va Germaniyada ordinatura', 'Ординатура в Турции и Германии'],
  'Clinical Research': ['Klinik tadqiqotlar', 'Клинические исследования'],
  'Portfolio Review': ['Portfolio tahlili', 'Разбор портфолио'],
  'Freelance & Studio Launch': ['Mustaqil ishlash va studiya ochish', 'Фриланс и открытие студии'],
  'International LL.M.': ['Xorijda huquq magistraturasi', 'Зарубежная магистратура LL.M.'],
  'Corporate Law Career': ['Korporativ huquqda karyera', 'Карьера в корпоративном праве'],
  'Scholarship Essays': ['Grant uchun motivatsion xat', 'Мотивационные письма на стипендию'],
  'IELTS & GRE Strategy': ['IELTS va GRE tayyorgarlik rejasi', 'План подготовки к IELTS и GRE'],
  'Export Logistics': ['Eksport logistikasi', 'Экспортная логистика'],
  'Starting a Business': ['Biznesni boshlash', 'Открытие бизнеса'],
  'System Design': ['Tizimlarni loyihalash', 'Проектирование систем'],
  'Tech Interview Prep': ['IT suhbatiga tayyorgarlik', 'Подготовка к IT-собеседованию'],
};

export function formatSpecialtyLabel(value: string, locale: string): string {
  const lang = language(locale);
  const labels = specialtyLabels[value];
  return labels && lang !== 'en' ? labels[lang === 'uz' ? 0 : 1] : value;
}

const weekdays: Record<string, [string, string]> = {
  Monday: ['Dushanba', 'Понедельник'], Tuesday: ['Seshanba', 'Вторник'],
  Wednesday: ['Chorshanba', 'Среда'], Thursday: ['Payshanba', 'Четверг'],
  Friday: ['Juma', 'Пятница'], Saturday: ['Shanba', 'Суббота'], Sunday: ['Yakshanba', 'Воскресенье'],
};

// Display-only formatting: booking requests must keep the mentor's exact slot.
export function formatSlotLabel(slot: string, locale: string): string {
  const lang = language(locale);
  if (lang === 'en') return slot;
  return slot.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?=,|\s|$)/,
    (day) => weekdays[day][lang === 'uz' ? 0 : 1]);
}

export function slotDurationMinutes(slot: string): number | null {
  const match = slot.match(/(?:^|[\s,])([01]?\d|2[0-3]):([0-5]\d)\s*[-–]\s*([01]?\d|2[0-3]):([0-5]\d)(?=\s|$)/);
  if (!match) return null;
  const duration = Number(match[3]) * 60 + Number(match[4]) - Number(match[1]) * 60 - Number(match[2]);
  return duration > 0 ? duration : null;
}
