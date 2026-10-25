-- Additive migration: existing users, sessions, bookings and payments stay intact.
CREATE TABLE counselors (
 id text PRIMARY KEY, full_name text NOT NULL, headline text NOT NULL,
 avatar_url text NOT NULL, specialties text[] NOT NULL DEFAULT '{}', bio text NOT NULL,
 standard_price integer NOT NULL DEFAULT 45000, premium_price integer NOT NULL DEFAULT 130000,
 rating double precision NOT NULL DEFAULT 0, reviews_count integer NOT NULL DEFAULT 0,
 available_slots text[] NOT NULL DEFAULT '{}', company text, why_work_with_me text,
 email text, joined_at timestamptz NOT NULL DEFAULT now(), commission_free_until timestamptz,
 price_per_question integer, soft_cap integer, is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX counselors_email_unique ON counselors(lower(email)) WHERE email IS NOT NULL;
CREATE TABLE counselor_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, headline text NOT NULL,
 specialties text NOT NULL, bio text NOT NULL, telegram text NOT NULL, email text NOT NULL,
 phone text NOT NULL, expected_standard_price integer, expected_premium_price integer,
 expected_price_per_question integer, expected_soft_cap integer, photo_url text NOT NULL,
 proof_link text NOT NULL, consent_published timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mentor_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), counselor_id text UNIQUE NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
 email text NOT NULL, password_hash text, invite_hash text UNIQUE, invite_expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX mentor_accounts_email_unique ON mentor_accounts(lower(email));
CREATE TABLE mentor_sessions (
 token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES mentor_accounts(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mentor_sessions_expiry ON mentor_sessions(expires_at);
CREATE TABLE profiles (
 id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 education_stage text CHECK (education_stage IN ('school','university','working','other')),
 is_under_18 boolean NOT NULL DEFAULT false, parental_consent boolean NOT NULL DEFAULT false,
 region text, telegram text, goal text, preferred_language text NOT NULL DEFAULT 'uz',
 privacy_consent boolean NOT NULL DEFAULT false, privacy_consent_at timestamptz, privacy_policy_version text
);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS education_stage text,
 ADD COLUMN IF NOT EXISTS is_under_18 boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS parental_consent boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS region text,
 ADD COLUMN IF NOT EXISTS privacy_consent boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS privacy_consent_at timestamptz;
CREATE TABLE forum_questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_name_or_anonymous text NOT NULL,
 email text NOT NULL DEFAULT '', category text NOT NULL, title text NOT NULL, body text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE forum_answers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question_id uuid NOT NULL REFERENCES forum_questions(id) ON DELETE CASCADE,
 counselor_id text NOT NULL REFERENCES counselors(id), body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE survey_responses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), age_range text, status text, field_of_study text,
 interest_area text, biggest_challenge text, prior_advice_source text, interested_in_service text NOT NULL,
 price_willingness text, preferred_format text, contact_info text NOT NULL, willing_to_refer boolean,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE platform_settings (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO platform_settings(key,value) VALUES ('global_launch_date','"2026-11-01T00:00:00.000Z"'::jsonb);
CREATE TABLE tracks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL, name_uz text NOT NULL,
 name_ru text, name_en text NOT NULL, short_description_uz text, icon text,
 is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mentor_tracks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mentor_id text NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
 track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE, is_primary boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(mentor_id,track_id)
);
CREATE INDEX mentor_tracks_mentor_idx ON mentor_tracks(mentor_id);
CREATE INDEX tracks_active_sort_idx ON tracks(is_active,sort_order);

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

