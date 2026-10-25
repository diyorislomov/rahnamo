-- ==============================================================================
-- Migration: 20261025_tracks_and_mentor_tracks.sql
-- Description: Replace hardcoded tracks with database-driven tracks and mentor_tracks join table.
-- ==============================================================================

-- 1. Create tracks table
CREATE TABLE IF NOT EXISTS public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_uz text NOT NULL,
  name_ru text,
  name_en text NOT NULL,
  short_description_uz text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create mentor_tracks join table
CREATE TABLE IF NOT EXISTS public.mentor_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id text NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mentor_tracks_mentor_track_unique UNIQUE (mentor_id, track_id)
);

-- Index for fast lookup by mentor and by track
CREATE INDEX IF NOT EXISTS idx_mentor_tracks_mentor_id ON public.mentor_tracks(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_tracks_track_id ON public.mentor_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_is_active_sort ON public.tracks(is_active, sort_order);

-- 3. Row-level Security (RLS)
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_tracks ENABLE ROW LEVEL SECURITY;

-- Tracks RLS: Everyone can read active tracks; authenticated/service role can read all
DROP POLICY IF EXISTS "Public can view active tracks" ON public.tracks;
CREATE POLICY "Public can view active tracks" ON public.tracks
  FOR SELECT USING (is_active = true OR auth.role() = 'service_role');

-- Admin full access on tracks via service role
DROP POLICY IF EXISTS "Service role can manage tracks" ON public.tracks;
CREATE POLICY "Service role can manage tracks" ON public.tracks
  FOR ALL USING (auth.role() = 'service_role');

-- Mentor tracks RLS: Public read, service role write
DROP POLICY IF EXISTS "Public can view mentor tracks" ON public.mentor_tracks;
CREATE POLICY "Public can view mentor tracks" ON public.mentor_tracks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage mentor tracks" ON public.mentor_tracks;
CREATE POLICY "Service role can manage mentor tracks" ON public.mentor_tracks
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Seed Launch Tracks (9 Active Launch Tracks + 5 Inactive Phase 2 Tracks)
INSERT INTO public.tracks (slug, name_en, name_uz, name_ru, short_description_uz, icon, is_active, sort_order)
VALUES
  ('it-software', 'IT & software development', 'IT va dasturlash', 'IT и разработка ПО', 'Dasturlash, arxitektura, veb va mobil ilovalar yaratish', '💻', true, 1),
  ('data-ai', 'Data science & AI', 'Data science va sun''iy intellekt', 'Data Science и ИИ', 'Ma''lumotlar tahlili, Machine Learning va AI modellar', '🧠', true, 2),
  ('finance', 'Finance, accounting & banking', 'Moliya, buxgalteriya va bank', 'Финансы, бухгалтерия и банки', 'Investitsiya, audit, bank ishi va shaxsiy moliya', '📊', true, 3),
  ('marketing-smm', 'Marketing & SMM', 'Marketing va SMM', 'Маркетинг и SMM', 'Raqamli marketing, brending va ijtimoiy tarmoqlar', '🚀', true, 4),
  ('business', 'Business & entrepreneurship', 'Biznes va tadbirkorlik', 'Бизнес и предпринимательство', 'Startaplar, operatsiyalar va biznesni kengaytirish', '💼', true, 5),
  ('study-abroad', 'Study abroad & scholarships', 'Chet elda o''qish va grantlar', 'Обучение за рубежом и гранты', 'Xalqaro universitetlar, grantlar va viza jarayonlari', '🎓', true, 6),
  ('trade-logistics', 'International trade & logistics', 'Xalqaro savdo va logistika', 'Международная торговля и логистика', 'Eksport-import, ta''minot zanjiri va bojxona', '🚢', true, 7),
  ('career-start', 'Career start (CV, interviews, first job)', 'Karyera boshlash (CV, intervyu, birinchi ish)', 'Старт карьеры (резюме, собеседования, первая работа)', 'Rezyume tayyorlash, intervyu va birinchi ish topish', '🎯', true, 8),
  ('design-creative', 'Design & creative (mobile content & video)', 'Dizayn va kreativ (mobil kontent va video)', 'Дизайн и креатив (мобильный контент и видео)', 'UI/UX dizayn, grafika, video montaj va mobil kontent', '🎨', true, 9),
  -- Phase 2 Inactive Tracks (is_active = false)
  ('medicine', 'Medicine & healthcare', 'Tibbiyot va sog''liqni saqlash', 'Медицина и здравоохранение', 'Klinik amaliyot, rezidentura va tibbiy tadqiqotlar', '🩺', false, 10),
  ('law', 'Law & legal practice', 'Huquqshunoslik va yuridik amaliyot', 'Юриспруденция', 'Korporativ huquq, advokatura va xalqaro huquq', '⚖️', false, 11),
  ('engineering', 'Engineering & architecture', 'Muhandislik va arxitektura', 'Инженерия и архитектура', 'Qurilish, sanoat va arxitektura loyihalari', '🏛️', false, 12),
  ('teaching', 'Teaching & education', 'Pedagogika va ta''lim', 'Преподавание и образование', 'Pedagogik mahorat, zamonaviy metodika va ta''lim boshqaruvi', '📚', false, 13),
  ('government', 'Public service & government', 'Davlat xizmati va boshqaruv', 'Государственная служба', 'Davlat boshqaruvi, ijtimoiy loyihalar va siyosat', '🏛️', false, 14)
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_uz = EXCLUDED.name_uz,
  name_ru = EXCLUDED.name_ru,
  short_description_uz = EXCLUDED.short_description_uz,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 5. Seed mentor_tracks mapping for current mentors
INSERT INTO public.mentor_tracks (mentor_id, track_id, is_primary)
SELECT 'c1', id, true FROM public.tracks WHERE slug = 'study-abroad'
ON CONFLICT (mentor_id, track_id) DO UPDATE SET is_primary = true;

INSERT INTO public.mentor_tracks (mentor_id, track_id, is_primary)
SELECT 'c1', id, false FROM public.tracks WHERE slug = 'career-start'
ON CONFLICT (mentor_id, track_id) DO UPDATE SET is_primary = false;

INSERT INTO public.mentor_tracks (mentor_id, track_id, is_primary)
SELECT 'c2', id, true FROM public.tracks WHERE slug = 'design-creative'
ON CONFLICT (mentor_id, track_id) DO UPDATE SET is_primary = true;

INSERT INTO public.mentor_tracks (mentor_id, track_id, is_primary)
SELECT 'c3', id, true FROM public.tracks WHERE slug = 'career-start'
ON CONFLICT (mentor_id, track_id) DO UPDATE SET is_primary = true;

INSERT INTO public.mentor_tracks (mentor_id, track_id, is_primary)
SELECT 'c3', id, false FROM public.tracks WHERE slug = 'study-abroad'
ON CONFLICT (mentor_id, track_id) DO UPDATE SET is_primary = false;

INSERT INTO public.mentor_tracks (mentor_id, track_id, is_primary)
SELECT 'c4', id, true FROM public.tracks WHERE slug = 'study-abroad'
ON CONFLICT (mentor_id, track_id) DO UPDATE SET is_primary = true;

INSERT INTO public.mentor_tracks (mentor_id, track_id, is_primary)
SELECT 'c5', id, true FROM public.tracks WHERE slug = 'trade-logistics'
ON CONFLICT (mentor_id, track_id) DO UPDATE SET is_primary = true;

INSERT INTO public.mentor_tracks (mentor_id, track_id, is_primary)
SELECT 'c5', id, false FROM public.tracks WHERE slug = 'business'
ON CONFLICT (mentor_id, track_id) DO UPDATE SET is_primary = false;

INSERT INTO public.mentor_tracks (mentor_id, track_id, is_primary)
SELECT 'c6', id, true FROM public.tracks WHERE slug = 'it-software'
ON CONFLICT (mentor_id, track_id) DO UPDATE SET is_primary = true;
