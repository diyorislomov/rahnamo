-- Rahnamo Supabase Database Schema

-- 1. Counselors Table
CREATE TABLE IF NOT EXISTS public.counselors (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    headline TEXT NOT NULL,
    avatar_url TEXT NOT NULL,
    specialties TEXT[] NOT NULL,
    bio TEXT NOT NULL,
    standard_price INTEGER NOT NULL DEFAULT 45000,
    premium_price INTEGER NOT NULL DEFAULT 130000,
    rating NUMERIC(2,1) NOT NULL DEFAULT 5.0,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    available_slots TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    counselor_id TEXT NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
    counselor_name TEXT NOT NULL,
    counselor_headline TEXT NOT NULL,
    counselor_avatar TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('standard', 'premium')),
    price INTEGER NOT NULL,
    slot TEXT NOT NULL,
    student_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    telegram TEXT NOT NULL,
    education TEXT NOT NULL,
    question TEXT NOT NULL,
    meet_link TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_receipt TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Counselor Applications Table (for prospective mentors)
CREATE TABLE IF NOT EXISTS public.counselor_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    headline TEXT NOT NULL,
    specialties TEXT NOT NULL,
    bio TEXT NOT NULL,
    telegram TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    expected_standard_price INTEGER,
    expected_premium_price INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Company / "Why work with me" — counselor profile enrichment
ALTER TABLE public.counselors ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.counselors ADD COLUMN IF NOT EXISTS why_work_with_me TEXT;

-- 5. Reviews Table (linked to a real completed booking, never fabricated)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    counselor_id TEXT NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
    student_first_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. "Ask Mentor Anything" public forum
CREATE TABLE IF NOT EXISTS public.forum_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name_or_anonymous TEXT NOT NULL,
    email TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.forum_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.forum_questions(id) ON DELETE CASCADE,
    counselor_id TEXT NOT NULL REFERENCES public.counselors(id),
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_answers ENABLE ROW LEVEL SECURITY;

-- Public RLS Policies
CREATE POLICY "Allow public read counselors" ON public.counselors FOR SELECT USING (true);
CREATE POLICY "Allow public read bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert applications" ON public.counselor_applications FOR INSERT WITH CHECK (true);

-- Reviews: read-only for now — no submission UI exists yet in this pass,
-- so there is deliberately no public INSERT policy here.
CREATE POLICY "Allow public read reviews" ON public.reviews FOR SELECT USING (true);

-- Forum: fully public read + write (no counselor auth yet — answering is
-- just a name picked from a dropdown, so this INSERT policy is what makes
-- that possible without a backend route; it also means the Supabase API
-- itself has no way to verify who's really posting. Moderation happens via
-- the admin panel's Forum tab, not at the database layer, until a real
-- counselor-auth pass exists.)
CREATE POLICY "Allow public read forum questions" ON public.forum_questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert forum questions" ON public.forum_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read forum answers" ON public.forum_answers FOR SELECT USING (true);
CREATE POLICY "Allow public insert forum answers" ON public.forum_answers FOR INSERT WITH CHECK (true);

-- Seed Initial Counselors
INSERT INTO public.counselors (id, full_name, headline, avatar_url, specialties, bio, standard_price, premium_price, rating, reviews_count, available_slots)
VALUES
  ('c1', 'Dr. Jasur Mansurov', 'Cardiologist & Medical Residency Mentor | Ex-Ankara Hospital', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop', ARRAY['Medicine & Healthcare', 'Residency in Turkey & Germany', 'Clinical Research'], 'Guiding medical students and young doctors through clinical residency exams abroad, licensing roadmaps, and choosing medical specialties.', 45000, 130000, 4.9, 38, ARRAY['Saturday, 15:00 - 15:30', 'Saturday, 16:00 - 16:30', 'Sunday, 11:00 - 11:30']),
  ('c2', 'Madina Shodieva', 'Lead Architect & Interior Designer | Studio Founder', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop', ARRAY['Architecture & Design', 'Portfolio Review', 'Freelance & Studio Launch'], '8+ years designing commercial and residential spaces across Central Asia. I review student portfolios and advise on landing clients.', 40000, 120000, 5.0, 29, ARRAY['Friday, 18:00 - 18:30', 'Saturday, 12:00 - 12:30', 'Sunday, 14:00 - 14:45']),
  ('c3', 'Otabek Rustamov', 'International Corporate Lawyer | LL.M. Leiden University', 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=400&fit=crop', ARRAY['Law & Legal Practice', 'International LL.M.', 'Corporate Law Career'], 'Assisting law students in navigating international master’s applications, bar preparation, and building a corporate legal career in Tashkent.', 50000, 150000, 4.8, 22, ARRAY['Saturday, 10:00 - 10:30', 'Sunday, 17:00 - 17:30']),
  ('c4', 'Kamila Yusupova', 'Fulbright Alumna | Education & Global Scholarships Coach', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop', ARRAY['Study Abroad', 'Scholarship Essays', 'IELTS & GRE Strategy'], 'Assisted 40+ students in securing fully-funded Master’s scholarships in the US, Europe, and Asia. Specialist in personal statement coaching.', 45000, 140000, 4.9, 45, ARRAY['Monday, 19:00 - 19:30', 'Thursday, 19:00 - 19:30', 'Saturday, 11:00 - 11:45']),
  ('c5', 'Sardor Ergashev', 'Agribusiness & Export Director | Regional Trade Advisor', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop', ARRAY['Agriculture & Trade', 'Export Logistics', 'Starting a Business'], 'Helping young entrepreneurs understand agricultural supply chains, food processing, export regulations, and starting regional ventures.', 40000, 110000, 4.9, 16, ARRAY['Saturday, 13:00 - 13:30', 'Sunday, 15:00 - 15:30']),
  ('c6', 'Azizbek Kholmatov', 'Principal Software Architect | Tech Mentor', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', ARRAY['Engineering & Tech', 'System Design', 'Tech Interview Prep'], '10+ years engineering large-scale distributed systems. Mentoring engineers from junior to senior and preparing for global tech interviews.', 50000, 160000, 5.0, 52, ARRAY['Saturday, 16:00 - 16:30', 'Sunday, 10:00 - 10:45'])
ON CONFLICT (id) DO NOTHING;

-- Backfill `company` for rows that already existed before this column was
-- added (the INSERT above is a no-op for them, via ON CONFLICT DO NOTHING).
UPDATE public.counselors SET company = v.company FROM (VALUES
  ('c1', 'Ex-Ankara Hospital'),
  ('c2', 'Shodieva Design Studio'),
  ('c3', 'LL.M. Leiden Alumnus'),
  ('c4', 'Fulbright Scholar'),
  ('c5', 'Central Asia Agribiz'),
  ('c6', 'Ex-Senior Architect')
) AS v(id, company)
WHERE public.counselors.id = v.id AND public.counselors.company IS NULL;
