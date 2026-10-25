import { getServiceRoleClient } from './supabaseServiceRole';
import { supabase } from './supabase';

export interface DbTrack {
  id?: string;
  slug: string;
  name_uz: string;
  name_ru: string | null;
  name_en: string;
  short_description_uz: string | null;
  icon: string;
  is_active: boolean;
  sort_order: number;
  mentor_count?: number;
}

export interface MentorTrackAssignment {
  mentor_id: string;
  track_id: string;
  slug: string;
  is_primary: boolean;
}

// Canonical seed tracks: 9 Launch Tracks (active) + 5 Phase 2 Tracks (inactive)
export const SEED_TRACKS: DbTrack[] = [
  {
    slug: 'it-software',
    name_en: 'IT & software development',
    name_uz: 'IT va dasturlash',
    name_ru: 'IT и разработка ПО',
    short_description_uz: 'Dasturlash, arxitektura, veb va mobil ilovalar yaratish',
    icon: '💻',
    is_active: true,
    sort_order: 1,
  },
  {
    slug: 'data-ai',
    name_en: 'Data science & AI',
    name_uz: "Data science va sun'iy intellekt",
    name_ru: 'Data Science и ИИ',
    short_description_uz: "Ma'lumotlar tahlili, Machine Learning va AI modellar",
    icon: '🧠',
    is_active: true,
    sort_order: 2,
  },
  {
    slug: 'finance',
    name_en: 'Finance, accounting & banking',
    name_uz: 'Moliya, buxgalteriya va bank',
    name_ru: 'Финансы, бухгалтерия и банки',
    short_description_uz: 'Investitsiya, audit, bank ishi va shaxsiy moliya',
    icon: '📊',
    is_active: true,
    sort_order: 3,
  },
  {
    slug: 'marketing-smm',
    name_en: 'Marketing & SMM',
    name_uz: 'Marketing va SMM',
    name_ru: 'Маркетинг и SMM',
    short_description_uz: 'Raqamli marketing, brending va ijtimoiy tarmoqlar',
    icon: '🚀',
    is_active: true,
    sort_order: 4,
  },
  {
    slug: 'business',
    name_en: 'Business & entrepreneurship',
    name_uz: 'Biznes va tadbirkorlik',
    name_ru: 'Бизнес и предпринимательство',
    short_description_uz: 'Startaplar, operatsiyalar va biznesni kengaytirish',
    icon: '💼',
    is_active: true,
    sort_order: 5,
  },
  {
    slug: 'study-abroad',
    name_en: 'Study abroad & scholarships',
    name_uz: "Chet elda o'qish va grantlar",
    name_ru: 'Обучение за рубежом и гранты',
    short_description_uz: 'Xalqaro universitetlar, grantlar va viza jarayonlari',
    icon: '🎓',
    is_active: true,
    sort_order: 6,
  },
  {
    slug: 'trade-logistics',
    name_en: 'International trade & logistics',
    name_uz: 'Xalqaro savdo va logistika',
    name_ru: 'Международная торговля и логистика',
    short_description_uz: "Eksport-import, ta'minot zanjiri va bojxona",
    icon: '🚢',
    is_active: true,
    sort_order: 7,
  },
  {
    slug: 'career-start',
    name_en: 'Career start (CV, interviews, first job)',
    name_uz: 'Karyera boshlash (CV, intervyu, birinchi ish)',
    name_ru: 'Старт карьеры (резюме, собеседования, первая работа)',
    short_description_uz: 'Rezyume tayyorlash, intervyu va birinchi ish topish',
    icon: '🎯',
    is_active: true,
    sort_order: 8,
  },
  {
    slug: 'design-creative',
    name_en: 'Design & creative (mobile content & video)',
    name_uz: 'Dizayn va kreativ (mobil kontent va video)',
    name_ru: 'Дизайн и креатив (мобильный контент и видео)',
    short_description_uz: 'UI/UX dizayn, grafika, video montaj va mobil kontent',
    icon: '🎨',
    is_active: true,
    sort_order: 9,
  },
  // Phase 2 Inactive Tracks (is_active = false)
  {
    slug: 'medicine',
    name_en: 'Medicine & healthcare',
    name_uz: "Tibbiyot va sog'liqni saqlash",
    name_ru: 'Медицина и здравоохранение',
    short_description_uz: 'Klinik amaliyot, rezidentura va tibbiy tadqiqotlar',
    icon: '🩺',
    is_active: false,
    sort_order: 10,
  },
  {
    slug: 'law',
    name_en: 'Law & legal practice',
    name_uz: 'Huquqshunoslik va yuridik amaliyot',
    name_ru: 'Юриспруденция',
    short_description_uz: 'Korporativ huquq, advokatura va xalqaro huquq',
    icon: '⚖️',
    is_active: false,
    sort_order: 11,
  },
  {
    slug: 'engineering',
    name_en: 'Engineering & architecture',
    name_uz: 'Muhandislik va arxitektura',
    name_ru: 'Инженерия и архитектура',
    short_description_uz: 'Qurilish, sanoat va arxitektura loyihalari',
    icon: '🏛️',
    is_active: false,
    sort_order: 12,
  },
  {
    slug: 'teaching',
    name_en: 'Teaching & education',
    name_uz: "Pedagogika va ta'lim",
    name_ru: 'Преподавание и образование',
    short_description_uz: "Pedagogik mahorat, zamonaviy metodika va ta'lim boshqaruvi",
    icon: '📚',
    is_active: false,
    sort_order: 13,
  },
  {
    slug: 'government',
    name_en: 'Public service & government',
    name_uz: 'Davlat xizmati va boshqaruv',
    name_ru: 'Государственная служба',
    short_description_uz: 'Davlat boshqaruvi, ijtimoiy loyihalar va siyosat',
    icon: '🏛️',
    is_active: false,
    sort_order: 14,
  },
];

/**
 * Fetch active tracks from DB with graceful fallback to SEED_TRACKS
 */
export async function getActiveTracks(): Promise<DbTrack[]> {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('[TRACKS_DB_FALLBACK]', err);
  }
  return SEED_TRACKS.filter((t) => t.is_active);
}

/**
 * Fetch all tracks (active & inactive) for Admin with approved mentor count
 */
export async function getAllTracksAdmin(): Promise<DbTrack[]> {
  try {
    const client = getServiceRoleClient();
    const { data: dbTracks, error: tErr } = await client
      .from('tracks')
      .select('*')
      .order('sort_order', { ascending: true });

    // Fetch approved counselors to compute mentor counts
    const { data: counselors } = await client
      .from('counselors')
      .select('id, specialties, is_active')
      .neq('is_active', false);

    const counts: Record<string, number> = {};
    if (Array.isArray(counselors)) {
      for (const c of counselors) {
        if (Array.isArray(c.specialties)) {
          for (const s of c.specialties) {
            counts[s] = (counts[s] || 0) + 1;
          }
        }
      }
    }

    const baseList: DbTrack[] =
      !tErr && Array.isArray(dbTracks) && dbTracks.length > 0 ? dbTracks : SEED_TRACKS;

    return baseList.map((t) => ({
      ...t,
      mentor_count: counts[t.slug] || 0,
    }));
  } catch (err) {
    console.warn('[TRACKS_ADMIN_FALLBACK]', err);
    return SEED_TRACKS.map((t) => ({ ...t, mentor_count: 0 }));
  }
}

/**
 * Update a track's status or sort order
 */
export async function updateTrack(
  slug: string,
  updates: { is_active?: boolean; sort_order?: number }
): Promise<boolean> {
  try {
    const client = getServiceRoleClient();
    const { error } = await client
      .from('tracks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('slug', slug);

    return !error;
  } catch (err) {
    console.error('[TRACKS_UPDATE_FAILED]', err);
    return false;
  }
}
