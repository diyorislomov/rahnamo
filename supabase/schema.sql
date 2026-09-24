-- Rahnamo Supabase Database Schema

-- =============================================================================
-- STANDING RULE -- read this before adding any new CREATE TABLE below.
--
-- Supabase stops auto-granting Data API access to new tables in the public
-- schema on 2026-10-30 (rolling out to all existing projects that day --
-- confirmed directly against Supabase's own changelog, "Breaking Change:
-- Tables not exposed to Data and GraphQL API automatically", not just taken
-- on faith from the general announcement). Today, creating a table
-- automatically grants SELECT/INSERT/UPDATE/DELETE to anon, authenticated,
-- and service_role; after the cutover, a table created with no explicit
-- GRANT is invisible to PostgREST/supabase-js -- "permission denied" no
-- matter how correct its RLS policies are, since GRANT and RLS are two
-- separate authorization layers (GRANT decides if a role can touch the
-- table at all; RLS decides which rows it sees once it's in).
--
-- Confirmed this needs NO action on any table already in this file: per
-- the same changelog, "Existing tables are not affected in your project,
-- they keep their current grants and stay reachable." This only bites a
-- CREATE TABLE that runs on or after 2026-10-30 with no explicit grant --
-- i.e. every table added to this file from now on.
--
-- So: every future CREATE TABLE in this file must be immediately followed
-- by explicit grants, scoped to whichever roles that table actually needs
-- -- e.g. a public read-only table only needs `anon` SELECT (see the
-- existing bookings/counselors RLS policies below for that exact
-- read/write split), not a blanket grant of all four privileges to every
-- role. Template:
--
--   GRANT SELECT ON public.your_table TO anon;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO authenticated;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO service_role;
--
-- This project has no Supabase Auth login anywhere today -- every table
-- below is read/written entirely as `anon`, gated by RLS policies, not by
-- an `authenticated` session -- so in practice a new table here will
-- usually only need an `anon` grant matching whatever RLS policies it
-- gets (see each table's own POLICY comments for the actual public
-- read/write shape to mirror). The `authenticated`/`service_role` lines
-- above are included for completeness in case that ever changes, not
-- because they're exercised by any table in this file yet.
-- =============================================================================

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
    -- Previously only ever lived in the browser's own localStorage copy of
    -- the booking -- blank for any booking viewed from a different device,
    -- same class of gap as counselor_applications' missing SELECT policy.
    payment_method TEXT NOT NULL DEFAULT 'payme' CHECK (payment_method IN ('payme', 'click', 'uzum')),
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

-- 4c. Commission-free onboarding window: joined_at defaults to the moment a
-- counselor row is created (i.e. approval time, since that INSERT is the
-- only thing that creates a counselors row).
--
-- commission_free_until was originally a GENERATED ALWAYS AS (joined_at +
-- INTERVAL '3 months') column -- rejected by Postgres with "42P17:
-- generation expression is not immutable", because timestamptz + interval
-- depends on the session's timezone/DST rules to resolve calendar-unit
-- arithmetic, which disqualifies it from a generated column no matter how
-- deterministic it looks in practice. A trigger has no such restriction (it
-- can freely call STABLE/VOLATILE functions), so it computes the same
-- single formula instead, applied automatically on every insert -- the
-- column is still never set by hand in application code.
--
-- Deliberately no DEFAULT on this ADD COLUMN: a volatile default (now()) on
-- ALTER TABLE ADD COLUMN forces a full table rewrite that evaluates the
-- default once and stamps every existing row with that same single
-- instant -- confirmed live, it silently defeated the "WHERE joined_at IS
-- NULL" backfill below by making joined_at already non-null everywhere
-- before the backfill ran, so every pre-existing counselor ended up with
-- joined_at = "whenever this migration happened to run" instead of their
-- real created_at. The default is attached separately, after backfilling,
-- so it only ever applies to rows inserted from this point on.
ALTER TABLE public.counselors ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.counselors ADD COLUMN IF NOT EXISTS commission_free_until TIMESTAMP WITH TIME ZONE;

-- Backfill existing rows. There's no recorded real approval date for rows
-- that predate joined_at, so created_at is the closest honest proxy.
UPDATE public.counselors SET joined_at = created_at WHERE joined_at IS NULL;
UPDATE public.counselors SET commission_free_until = joined_at + INTERVAL '3 months' WHERE commission_free_until IS NULL;

ALTER TABLE public.counselors ALTER COLUMN joined_at SET DEFAULT timezone('utc'::text, now());

CREATE OR REPLACE FUNCTION public.set_counselor_commission_window()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.joined_at IS NULL THEN
    NEW.joined_at := timezone('utc'::text, now());
  END IF;
  NEW.commission_free_until := NEW.joined_at + INTERVAL '3 months';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_counselor_commission_window ON public.counselors;
CREATE TRIGGER trg_set_counselor_commission_window
  BEFORE INSERT OR UPDATE OF joined_at ON public.counselors
  FOR EACH ROW EXECUTE FUNCTION public.set_counselor_commission_window();

-- 4b. Defensive backfill for the `bookings` table: the CREATE TABLE above is
-- a no-op if the table already existed from an earlier deploy that predates
-- these columns (confirmed live: an already-provisioned project was missing
-- all four, causing every booking insert to fail with PGRST204). Safe to
-- run even when the table is brand new -- IF NOT EXISTS makes each line a
-- no-op in that case.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meet_link TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_receipt TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';

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

-- 7. Public interest survey (/survey) -- a lead-gen form, not tied to any
-- booking. "Other" free text for interest_area/prior_advice_source is
-- stored directly in that same column, no separate _other column.
CREATE TABLE IF NOT EXISTS public.survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    age_range TEXT,
    status TEXT,
    field_of_study TEXT,
    interest_area TEXT,
    biggest_challenge TEXT,
    prior_advice_source TEXT,
    interested_in_service TEXT NOT NULL,
    price_willingness TEXT,
    preferred_format TEXT,
    contact_info TEXT NOT NULL,
    willing_to_refer BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration for a database created before payment_method existed -- adds
-- the column to an already-live bookings table (CREATE TABLE above only
-- affects a fresh install). Safe to run repeatedly (IF NOT EXISTS).
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'payme' CHECK (payment_method IN ('payme', 'click', 'uzum'));

-- Captured once, client-side, at the moment the student submits the
-- booking (their own browser's locale at that instant) -- never re-derived
-- later from whichever session's cookie happens to trigger a follow-up
-- email. The payment-confirmed email is sent from the ADMIN's own browser
-- session, often much later, so reading a cookie at send-time would pick
-- the ADMIN's language, not the student's.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'uz';

-- Enable Row Level Security (RLS)
ALTER TABLE public.counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Public RLS Policies
CREATE POLICY "Allow public read counselors" ON public.counselors FOR SELECT USING (true);
CREATE POLICY "Allow public read bookings" ON public.bookings FOR SELECT USING (true);
-- NOTE: the live database's actual INSERT policy on bookings is currently
-- named "Anyone can create a booking", not this name -- discovered via
-- `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookings'`
-- when this file's documented names no longer matched reality (most likely
-- from a manual edit made directly in the Supabase dashboard at some point).
-- Same INSERT WITH CHECK (true) semantics either way; this file is only out
-- of sync on the name. Kept here unchanged for a fresh install.
CREATE POLICY "Allow public insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
-- No UPDATE policy existed until now, so admin's "confirm payment" button was
-- silently failing against Supabase the whole time (RLS default-denies).
-- Needed now for both that button and marking a session "completed". This
-- one was ALSO found dropped from the live DB partway through a later
-- session (a batch of unrelated DROP POLICY statements had a name typo on
-- an adjacent line that silently skipped past without rolling back the
-- rest) -- confirmed with a real insert+update+read-back showing
-- payment_status silently staying 'pending' with no error, then restored.
CREATE POLICY "Allow public update bookings" ON public.bookings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public update applications" ON public.counselor_applications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public insert counselors" ON public.counselors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert applications" ON public.counselor_applications FOR INSERT WITH CHECK (true);
-- No SELECT policy existed until now, so admin's applications tab could
-- never actually read a real row back (RLS silently returns zero rows,
-- no error) -- it was always rendering the localStorage/mock fallback,
-- which is also why approve/reject's status updates looked like they
-- worked in the UI but never reliably matched a real row by id.
CREATE POLICY "Allow public read applications" ON public.counselor_applications FOR SELECT USING (true);
-- Needed for admin's delete-application action.
CREATE POLICY "Allow public delete applications" ON public.counselor_applications FOR DELETE USING (true);

CREATE POLICY "Allow public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow public insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

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

-- Survey: public insert (anyone can submit) + public read (same actual
-- pattern bookings/applications ended up needing tonight -- without this,
-- admin's new tab would hit the identical "reads back empty, no error"
-- bug those two just got fixed for). The only real gate is the
-- password-protected admin UI, not RLS.
CREATE POLICY "Allow public insert survey responses" ON public.survey_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read survey responses" ON public.survey_responses FOR SELECT USING (true);

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

-- 8. "Matnli maslahat" (Text Q&A) -- a running-tab text consultation
-- alongside the existing Standard/Premium video tiers. Full design writeup
-- lived in the planning conversation; the short version of what's below:
--
--   * price_per_question / soft_cap are mentor-set, alongside the existing
--     standard_price / premium_price -- NULL price_per_question means that
--     mentor doesn't offer this tier at all.
--   * A thread's own price_per_question/soft_cap are a SNAPSHOT taken from
--     the counselor row at thread-creation time (via a trigger, not client
--     input -- see trg_snapshot_thread_pricing below), so a client can
--     never set its own price, and a later price change by the mentor
--     never retroactively changes an already-open thread.
--   * Real per-student privacy (not just app-layer filtering by device_id,
--     the way `bookings` works today) requires real identity, which this
--     project has never had before. Students get one via Supabase
--     Anonymous Auth (`supabase.auth.signInAnonymously()`, called lazily
--     client-side only when starting a thread) -- `student_auth_id` is
--     that session's real `auth.uid()`, and RLS below checks it directly.
--     This needs "Allow anonymous sign-ins" enabled once in the Supabase
--     dashboard (Authentication -> Sign In / Providers) -- without it,
--     thread creation fails outright, loudly, not silently.
--   * Mentors have no per-counselor auth (same accepted gap as forum
--     replies, gated by the same shared COUNSELOR_PASSCODE) -- but unlike
--     forum, that passcode check is backed by real enforcement here: no
--     RLS policy on either table below grants a `sender_role = 'counselor'`
--     insert at all, so the only way a counselor reply reaches the table is
--     through /api/threads/reply using the service_role key server-side,
--     never the anon key. The passcode check happening first is what makes
--     it "gated"; the missing counselor-insert policy is what makes that
--     gate not just cosmetic.
--   * questions_used/total_owed are the only columns a student can write
--     directly (via ask_thread_question below, which still runs under
--     their own RLS as SECURITY INVOKER, not a bypass) -- they have no
--     grant on payment_status, price_per_question, or soft_cap, so there's
--     no path for a student to un-cap or re-open their own thread.
--   * Reaching soft_cap is auto-detected by a BEFORE UPDATE trigger
--     (trg_enforce_thread_soft_cap) that flips payment_status when
--     questions_used crosses it -- not by the student's own update
--     containing that column, since they have no grant on it.

ALTER TABLE public.counselors ADD COLUMN IF NOT EXISTS price_per_question INTEGER;
ALTER TABLE public.counselors ADD COLUMN IF NOT EXISTS soft_cap INTEGER;

ALTER TABLE public.counselor_applications ADD COLUMN IF NOT EXISTS expected_price_per_question INTEGER;
ALTER TABLE public.counselor_applications ADD COLUMN IF NOT EXISTS expected_soft_cap INTEGER;

-- Widens the existing tier check rather than replacing bookings wholesale --
-- a "Matnli maslahat" thread still creates a real bookings row (price 0,
-- since nothing is prepaid) purely so it shows up in /my-bookings the same
-- way a video session does, with no separate history UI needed.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_tier_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_tier_check CHECK (tier IN ('standard', 'premium', 'text_qa'));

CREATE TABLE IF NOT EXISTS public.question_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    counselor_id TEXT NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
    -- The real, enforced identity (see the writeup above) -- device_id is
    -- kept alongside purely for display/debug parity with bookings, and is
    -- never referenced by any RLS policy on this table.
    student_auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    -- Snapshotted from counselors at INSERT time by
    -- trg_snapshot_thread_pricing below -- never trust a client-supplied
    -- value for either of these two.
    price_per_question INTEGER NOT NULL,
    soft_cap INTEGER,
    questions_used INTEGER NOT NULL DEFAULT 0,
    total_owed INTEGER NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'active' CHECK (payment_status IN ('active', 'awaiting_payment', 'closed')),
    payment_receipt TEXT,
    -- Persisted, not just a UI gate that's forgotten the moment the
    -- checkbox unmounts -- a real record that 18+ self-attestation
    -- actually happened, and when.
    age_confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.thread_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.question_threads(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('student', 'counselor')),
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.question_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;

-- Real, per-student RLS -- unlike every other table in this file, this is
-- NOT `USING (true)`. Only the student who created a thread (their real
-- signed-in-anonymously auth.uid(), not a spoofable device_id) can read or
-- create it. No policy anywhere grants a counselor or the public `anon`
-- role read access -- that happens exclusively through service_role in the
-- admin/counselor server routes, deliberately outside RLS, not by loosening
-- these policies.
CREATE POLICY "Students can read their own threads" ON public.question_threads
  FOR SELECT USING (auth.uid() = student_auth_id);
CREATE POLICY "Students can create their own threads" ON public.question_threads
  FOR INSERT WITH CHECK (auth.uid() = student_auth_id);
CREATE POLICY "Students can update their own thread progress" ON public.question_threads
  FOR UPDATE USING (auth.uid() = student_auth_id) WITH CHECK (auth.uid() = student_auth_id);

CREATE POLICY "Students can read messages in their own threads" ON public.thread_messages
  FOR SELECT USING (
    thread_id IN (SELECT id FROM public.question_threads WHERE student_auth_id = auth.uid())
  );
-- Deliberately only ever inserts as 'student' -- there is no policy here
-- (or anywhere else on this table) that permits a 'counselor' row via the
-- anon/authenticated roles. See the writeup above for why that's the real
-- enforcement, not the passcode check in /api/threads/reply.
CREATE POLICY "Students can ask questions in their own threads" ON public.thread_messages
  FOR INSERT WITH CHECK (
    sender_role = 'student'
    AND thread_id IN (SELECT id FROM public.question_threads WHERE student_auth_id = auth.uid())
  );

-- Column-scoped on purpose: `authenticated` (which is what a
-- signed-in-anonymously student actually is) gets a real grant on
-- question_threads, but only ever on the columns that are safe for a
-- student to touch themselves. No grant at all on payment_status,
-- price_per_question, or soft_cap -- ask_thread_question below is the only
-- path that advances questions_used/total_owed, and the soft-cap trigger
-- (not the student) is what flips payment_status.
GRANT SELECT ON public.question_threads TO anon, authenticated;
GRANT INSERT (id, booking_id, counselor_id, student_auth_id, device_id, age_confirmed_at) ON public.question_threads TO authenticated;
GRANT UPDATE (questions_used, total_owed, payment_receipt) ON public.question_threads TO authenticated;
GRANT ALL ON public.question_threads TO service_role;

GRANT SELECT ON public.thread_messages TO anon, authenticated;
GRANT INSERT (id, thread_id, sender_role, body) ON public.thread_messages TO authenticated;
GRANT ALL ON public.thread_messages TO service_role;

-- Overwrites whatever (if anything) a client sends for these two columns
-- with the counselor's own current values -- the only place a thread's
-- price is ever allowed to come from. Also the enforcement point for "this
-- mentor doesn't offer text Q&A at all" (NULL price_per_question).
CREATE OR REPLACE FUNCTION public.snapshot_thread_pricing()
RETURNS TRIGGER AS $$
DECLARE
  v_price INTEGER;
  v_cap INTEGER;
BEGIN
  SELECT price_per_question, soft_cap INTO v_price, v_cap
  FROM public.counselors WHERE id = NEW.counselor_id;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Counselor % does not offer text Q&A (no price_per_question set)', NEW.counselor_id;
  END IF;

  NEW.price_per_question := v_price;
  NEW.soft_cap := v_cap;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_snapshot_thread_pricing ON public.question_threads;
CREATE TRIGGER trg_snapshot_thread_pricing
  BEFORE INSERT ON public.question_threads
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_thread_pricing();

-- Auto-detects reaching soft_cap and flips payment_status accordingly.
-- Runs as a BEFORE UPDATE trigger mutating NEW directly (not issuing a
-- second statement of its own), so it isn't subject to the invoking role's
-- column-grant list the way a second UPDATE statement would be -- the
-- standard Postgres pattern for "derive column B from column A the caller
-- doesn't have write access to." Only ever transitions FROM 'active', so it
-- can't fight with an admin's own 'closed'/'awaiting_payment' write.
CREATE OR REPLACE FUNCTION public.enforce_thread_soft_cap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.soft_cap IS NOT NULL
     AND NEW.questions_used >= NEW.soft_cap
     AND OLD.payment_status = 'active' THEN
    NEW.payment_status := 'awaiting_payment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_thread_soft_cap ON public.question_threads;
CREATE TRIGGER trg_enforce_thread_soft_cap
  BEFORE UPDATE ON public.question_threads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_thread_soft_cap();

-- The only path a student uses to ask a question. SECURITY INVOKER (the
-- default, stated explicitly) -- this is not a privilege-escalation
-- bypass, it runs under the caller's own RLS and column grants the whole
-- way through; it exists purely to make "insert the message + increment
-- the counter + recompute the total" one atomic statement, so two
-- near-simultaneous questions near soft_cap can't both slip through.
CREATE OR REPLACE FUNCTION public.ask_thread_question(p_thread_id UUID, p_body TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_thread public.question_threads;
  v_new_count INTEGER;
  v_new_total INTEGER;
BEGIN
  SELECT * INTO v_thread FROM public.question_threads WHERE id = p_thread_id;

  IF v_thread IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_thread.payment_status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'awaiting_payment');
  END IF;

  IF p_body IS NULL OR trim(p_body) = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'empty_body');
  END IF;

  INSERT INTO public.thread_messages (thread_id, sender_role, body)
  VALUES (p_thread_id, 'student', trim(p_body));

  v_new_count := v_thread.questions_used + 1;
  v_new_total := v_new_count * v_thread.price_per_question;

  UPDATE public.question_threads
  SET questions_used = v_new_count,
      total_owed = v_new_total
  WHERE id = p_thread_id;

  RETURN jsonb_build_object(
    'success', true,
    'questions_used', v_new_count,
    'total_owed', v_new_total,
    'awaiting_payment', (v_thread.soft_cap IS NOT NULL AND v_new_count >= v_thread.soft_cap)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ask_thread_question(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ask_thread_question(UUID, TEXT) TO authenticated;
