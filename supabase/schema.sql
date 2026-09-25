-- Rahnamo: repeatable fresh installation. Requires Supabase auth schema and roles.
-- Existing installations: apply migrations/20260925_platform_integrity.sql instead.
-- No demonstration people, reviews or availability are seeded into production.
BEGIN;
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

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    counselor_id TEXT NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
    student_first_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- Apply to an existing Rahnamo database before deploying the new server.
-- Historical bookings without an authenticated owner remain administrator-only.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS student_auth_id UUID REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'uz';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_receipt TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'payme';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meet_link TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_tier_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_tier_check CHECK (tier IN ('standard','premium','text_qa'));
ALTER TABLE public.counselors ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.counselors ADD COLUMN IF NOT EXISTS why_work_with_me TEXT;
ALTER TABLE public.counselors ADD COLUMN IF NOT EXISTS price_per_question INTEGER;
ALTER TABLE public.counselors ADD COLUMN IF NOT EXISTS soft_cap INTEGER;
ALTER TABLE public.counselors ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ;
ALTER TABLE public.counselors ADD COLUMN IF NOT EXISTS commission_free_until TIMESTAMPTZ;
UPDATE public.counselors SET joined_at = created_at WHERE joined_at IS NULL;
UPDATE public.counselors SET commission_free_until = joined_at + interval '3 months' WHERE commission_free_until IS NULL;
ALTER TABLE public.counselors ALTER COLUMN joined_at SET DEFAULT now();
ALTER TABLE public.counselor_applications ADD COLUMN IF NOT EXISTS expected_standard_price INTEGER;
ALTER TABLE public.counselor_applications ADD COLUMN IF NOT EXISTS expected_premium_price INTEGER;
ALTER TABLE public.counselor_applications ADD COLUMN IF NOT EXISTS expected_price_per_question INTEGER;
ALTER TABLE public.counselor_applications ADD COLUMN IF NOT EXISTS expected_soft_cap INTEGER;
ALTER TABLE public.counselor_applications ADD COLUMN IF NOT EXISTS counselor_id TEXT REFERENCES public.counselors(id);
ALTER TABLE public.thread_messages ADD COLUMN IF NOT EXISTS request_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS thread_message_request ON public.thread_messages(thread_id, request_id);
CREATE INDEX IF NOT EXISTS bookings_student_created ON public.bookings(student_auth_id, created_at DESC);
CREATE INDEX IF NOT EXISTS threads_student_counselor ON public.question_threads(student_auth_id, counselor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS threads_counselor_created ON public.question_threads(counselor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_thread_created ON public.thread_messages(thread_id, created_at);
CREATE TABLE IF NOT EXISTS public.api_rate_limits (key TEXT PRIMARY KEY, window_start TIMESTAMPTZ NOT NULL, hits INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS api_limits_window ON public.api_rate_limits(window_start);

-- Remove old broad grants AND additive column grants before narrowing access.
DO $$ DECLARE t TEXT; cols TEXT; p RECORD; BEGIN
  FOREACH t IN ARRAY ARRAY['counselors','bookings','counselor_applications','reviews','forum_questions','forum_answers','survey_responses','question_threads','thread_messages','api_rate_limits'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    SELECT string_agg(quote_ident(column_name), ',') INTO cols FROM information_schema.columns WHERE table_schema='public' AND table_name=t;
    EXECUTE format('REVOKE ALL (%s) ON public.%I FROM PUBLIC, anon, authenticated', cols, t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;
GRANT SELECT ON public.counselors, public.reviews, public.forum_answers TO anon, authenticated;
CREATE POLICY public_counselors ON public.counselors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_reviews ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_answers ON public.forum_answers FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.bookings, public.question_threads, public.thread_messages TO authenticated;
CREATE POLICY owned_bookings ON public.bookings FOR SELECT TO authenticated USING (student_auth_id = auth.uid());
CREATE POLICY owned_threads ON public.question_threads FOR SELECT TO authenticated USING (student_auth_id = auth.uid());
CREATE POLICY owned_messages ON public.thread_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.question_threads t WHERE t.id = thread_id AND t.student_auth_id = auth.uid()));
GRANT UPDATE (payment_receipt) ON public.question_threads TO authenticated;
CREATE POLICY owned_receipt ON public.question_threads FOR UPDATE TO authenticated USING (student_auth_id = auth.uid() AND payment_status = 'awaiting_payment') WITH CHECK (student_auth_id = auth.uid());

-- The view intentionally runs as its owner: public sees the explicit safe projection,
-- while no anonymous/authenticated role has access to the source email column.
CREATE OR REPLACE VIEW public.public_forum_questions WITH (security_barrier=true) AS
SELECT id, student_name_or_anonymous, category, title, body, created_at FROM public.forum_questions;
REVOKE ALL ON public.public_forum_questions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_forum_questions TO anon, authenticated, service_role;

-- NOT VALID preserves historical rows for administrator reconciliation while checking
-- every new write. No records are silently deleted or reassigned during migration.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='counselors_positive_pricing' AND conrelid='public.counselors'::regclass) THEN
    ALTER TABLE public.counselors ADD CONSTRAINT counselors_positive_pricing CHECK (standard_price > 0 AND premium_price > 0 AND (price_per_question IS NULL OR price_per_question > 0) AND (soft_cap IS NULL OR soft_cap BETWEEN 1 AND 100)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='threads_valid_receipt' AND conrelid='public.question_threads'::regclass) THEN
    ALTER TABLE public.question_threads ADD CONSTRAINT threads_valid_receipt CHECK (payment_receipt IS NULL OR length(payment_receipt) BETWEEN 3 AND 200) NOT VALID;
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.set_counselor_commission_window() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  NEW.joined_at := coalesce(NEW.joined_at, now());
  NEW.commission_free_until := NEW.joined_at + interval '3 months'; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_set_counselor_commission_window ON public.counselors;
CREATE TRIGGER trg_set_counselor_commission_window BEFORE INSERT OR UPDATE OF joined_at ON public.counselors FOR EACH ROW EXECUTE FUNCTION public.set_counselor_commission_window();
CREATE OR REPLACE FUNCTION public.snapshot_thread_pricing() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE c public.counselors; BEGIN
  SELECT * INTO c FROM public.counselors WHERE id=NEW.counselor_id;
  IF c.price_per_question IS NULL OR c.price_per_question <= 0 THEN RAISE EXCEPTION 'text_qa_unavailable'; END IF;
  NEW.price_per_question:=c.price_per_question; NEW.soft_cap:=c.soft_cap; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_snapshot_thread_pricing ON public.question_threads;
CREATE TRIGGER trg_snapshot_thread_pricing BEFORE INSERT ON public.question_threads FOR EACH ROW EXECUTE FUNCTION public.snapshot_thread_pricing();
-- Locking and cap transitions now live in the only permitted question-writing RPC.
DROP TRIGGER IF EXISTS trg_enforce_thread_soft_cap ON public.question_threads;
DROP FUNCTION IF EXISTS public.enforce_thread_soft_cap();
DROP FUNCTION IF EXISTS public.ask_thread_question(UUID,TEXT);
CREATE OR REPLACE FUNCTION public.ask_thread_question(p_thread_id UUID, p_body TEXT, p_request_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t public.question_threads; BEGIN
  SELECT * INTO t FROM public.question_threads WHERE id=p_thread_id AND student_auth_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'reason','not_found'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id=t.booking_id AND student_auth_id=auth.uid() AND counselor_id=t.counselor_id AND tier='text_qa') THEN RETURN jsonb_build_object('success',false,'reason','ownership_unverified'); END IF;
  IF p_request_id IS NULL OR p_body IS NULL OR length(trim(p_body)) NOT BETWEEN 1 AND 4000 THEN RETURN jsonb_build_object('success',false,'reason','invalid_input'); END IF;
  IF EXISTS (SELECT 1 FROM public.thread_messages WHERE thread_id=t.id AND request_id=p_request_id) THEN
    IF EXISTS (SELECT 1 FROM public.thread_messages WHERE thread_id=t.id AND request_id=p_request_id AND body<>trim(p_body)) THEN RETURN jsonb_build_object('success',false,'reason','id_conflict'); END IF;
    RETURN jsonb_build_object('success',true,'questions_used',t.questions_used,'total_owed',t.total_owed,'awaiting_payment',t.payment_status<>'active');
  END IF;
  IF t.payment_status<>'active' THEN RETURN jsonb_build_object('success',false,'reason','awaiting_payment'); END IF;
  IF t.questions_used >= 10000 OR t.total_owed::bigint+t.price_per_question > 2147483647 THEN RETURN jsonb_build_object('success',false,'reason','limit_reached'); END IF;
  INSERT INTO public.thread_messages(thread_id,sender_role,body,request_id) VALUES(t.id,'student',trim(p_body),p_request_id);
  UPDATE public.question_threads SET questions_used=questions_used+1,total_owed=total_owed+price_per_question,
    payment_status=CASE WHEN soft_cap IS NOT NULL AND questions_used+1 >= soft_cap THEN 'awaiting_payment' ELSE 'active' END
    WHERE id=t.id RETURNING * INTO t;
  UPDATE public.bookings SET price=t.total_owed WHERE id=t.booking_id;
  RETURN jsonb_build_object('success',true,'questions_used',t.questions_used,'total_owed',t.total_owed,'awaiting_payment',t.payment_status<>'active');
END $$;
REVOKE ALL ON FUNCTION public.ask_thread_question(UUID,TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ask_thread_question(UUID,TEXT,UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_api_limit(p_key TEXT,p_limit INTEGER,p_window_seconds INTEGER) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n INTEGER; BEGIN
  IF p_limit<1 OR p_window_seconds<1 OR length(p_key)>128 THEN RAISE EXCEPTION 'invalid_limit'; END IF;
  DELETE FROM public.api_rate_limits WHERE window_start<now()-interval '1 day';
  INSERT INTO public.api_rate_limits AS r VALUES(p_key,now(),1)
  ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN r.window_start<now()-make_interval(secs=>p_window_seconds) THEN 1 ELSE r.hits+1 END,
    window_start=CASE WHEN r.window_start<now()-make_interval(secs=>p_window_seconds) THEN now() ELSE r.window_start END RETURNING hits INTO n;
  RETURN n<=p_limit;
END $$;

CREATE OR REPLACE FUNCTION public.start_question_thread(p_booking_id TEXT,p_counselor_id TEXT,p_student_id UUID,p_locale TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t public.question_threads; b public.bookings; c public.counselors; BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_student_id::text||':'||p_counselor_id,0));
  SELECT * INTO b FROM public.bookings WHERE id=p_booking_id;
  IF FOUND AND (b.student_auth_id IS DISTINCT FROM p_student_id OR b.counselor_id<>p_counselor_id OR b.tier<>'text_qa') THEN RAISE EXCEPTION 'id_conflict'; END IF;
  SELECT * INTO t FROM public.question_threads WHERE student_auth_id=p_student_id AND counselor_id=p_counselor_id AND (booking_id=p_booking_id OR payment_status<>'closed') ORDER BY (booking_id=p_booking_id) DESC, created_at DESC LIMIT 1;
  IF FOUND THEN
    SELECT * INTO b FROM public.bookings WHERE id=t.booking_id;
    RETURN jsonb_build_object('thread',to_jsonb(t),'booking',to_jsonb(b));
  END IF;
  SELECT * INTO c FROM public.counselors WHERE id=p_counselor_id;
  IF NOT FOUND OR c.price_per_question IS NULL OR c.price_per_question<=0 THEN RAISE EXCEPTION 'text_qa_unavailable'; END IF;
  INSERT INTO public.bookings(id,student_auth_id,device_id,counselor_id,counselor_name,counselor_headline,counselor_avatar,tier,price,slot,student_name,email,phone,telegram,education,question,locale)
    VALUES(p_booking_id,p_student_id,p_student_id::text,c.id,c.full_name,c.headline,c.avatar_url,'text_qa',0,'','Student','','','','','',CASE WHEN p_locale IN ('uz','en','ru') THEN p_locale ELSE 'uz' END) RETURNING * INTO b;
  INSERT INTO public.question_threads(booking_id,counselor_id,student_auth_id,device_id,price_per_question,age_confirmed_at)
    VALUES(b.id,c.id,p_student_id,p_student_id::text,c.price_per_question,now()) RETURNING * INTO t;
  RETURN jsonb_build_object('thread',to_jsonb(t),'booking',to_jsonb(b));
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_booking(p_booking_id TEXT,p_action TEXT,p_meet_link TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE b public.bookings; BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false); END IF;
  IF p_action='confirm_payment' AND b.tier<>'text_qa' AND b.status<>'cancelled' THEN
    IF p_meet_link !~ '^https://meet\.jit\.si/rahnamo-[0-9a-f-]{36}$' THEN RAISE EXCEPTION 'invalid_meeting'; END IF;
    UPDATE public.bookings SET payment_status='confirmed',meet_link=coalesce(meet_link,p_meet_link) WHERE id=b.id RETURNING * INTO b;
  ELSIF p_action='complete' AND b.payment_status='confirmed' AND b.status<>'cancelled' THEN
    UPDATE public.bookings SET status='completed' WHERE id=b.id RETURNING * INTO b;
  ELSE RETURN jsonb_build_object('success',false); END IF;
  RETURN jsonb_build_object('success',true,'booking',to_jsonb(b));
END $$;
CREATE OR REPLACE FUNCTION public.admin_update_thread(p_thread_id UUID,p_action TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t public.question_threads; BEGIN
  SELECT * INTO t FROM public.question_threads WHERE id=p_thread_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false); END IF;
  IF p_action='flag' AND t.payment_status='active' AND t.questions_used>0 THEN
    UPDATE public.question_threads SET payment_status='awaiting_payment' WHERE id=t.id RETURNING * INTO t;
  ELSIF p_action='confirm_payment' AND t.payment_status IN ('awaiting_payment','closed') THEN
    UPDATE public.question_threads SET payment_status='closed',closed_at=coalesce(closed_at,now()) WHERE id=t.id RETURNING * INTO t;
    UPDATE public.bookings SET payment_status='confirmed',price=t.total_owed,payment_receipt=t.payment_receipt WHERE id=t.booking_id;
  ELSE RETURN jsonb_build_object('success',false); END IF;
  RETURN jsonb_build_object('success',true,'thread',to_jsonb(t));
END $$;

CREATE OR REPLACE FUNCTION public.moderate_application(p_id UUID,p_action TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.counselor_applications; cid TEXT; BEGIN
  SELECT * INTO a FROM public.counselor_applications WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false); END IF;
  IF p_action='approve' THEN
    IF a.status='approved' AND a.counselor_id IS NOT NULL THEN RETURN jsonb_build_object('success',true,'counselorId',a.counselor_id); END IF;
    IF a.status<>'pending' OR a.expected_standard_price IS NULL OR a.expected_standard_price<=0 OR a.expected_premium_price IS NULL OR a.expected_premium_price<=0 THEN RETURN jsonb_build_object('success',false); END IF;
    cid := 'c-app-'||a.id::text;
    INSERT INTO public.counselors(id,full_name,headline,avatar_url,specialties,bio,standard_price,premium_price,rating,reviews_count,available_slots,price_per_question,soft_cap)
      VALUES(cid,a.full_name,a.headline,'',regexp_split_to_array(a.specialties,',\s*'),a.bio,a.expected_standard_price,a.expected_premium_price,0,0,ARRAY[]::text[],a.expected_price_per_question,a.expected_soft_cap);
    UPDATE public.counselor_applications SET status='approved',counselor_id=cid WHERE id=a.id;
    RETURN jsonb_build_object('success',true,'counselorId',cid);
  ELSIF p_action='reject' AND a.status='pending' THEN UPDATE public.counselor_applications SET status='rejected' WHERE id=a.id;
  ELSIF p_action='delete' THEN DELETE FROM public.counselor_applications WHERE id=a.id;
  ELSE RETURN jsonb_build_object('success',false); END IF;
  RETURN jsonb_build_object('success',true);
END $$;

CREATE OR REPLACE FUNCTION public.create_booking_review(p_booking_id TEXT,p_student_id UUID,p_rating INTEGER,p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE b public.bookings; r public.reviews; BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=p_booking_id AND student_auth_id=p_student_id FOR UPDATE;
  IF NOT FOUND OR b.status<>'completed' OR b.payment_status<>'confirmed' THEN RAISE EXCEPTION 'booking_not_reviewable'; END IF;
  IF p_rating NOT BETWEEN 1 AND 5 OR p_rating IS NULL OR p_text IS NULL OR length(trim(p_text)) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'invalid_review'; END IF;
  IF EXISTS (SELECT 1 FROM public.reviews WHERE booking_id=b.id) THEN RAISE EXCEPTION 'already_reviewed'; END IF;
  -- Serialize aggregation for simultaneous reviews of different bookings with one mentor.
  PERFORM 1 FROM public.counselors WHERE id=b.counselor_id FOR UPDATE;
  INSERT INTO public.reviews(booking_id,counselor_id,student_first_name,rating,review_text) VALUES(b.id,b.counselor_id,split_part(b.student_name,' ',1),p_rating,trim(p_text)) RETURNING * INTO r;
  UPDATE public.counselors SET rating=(SELECT round(avg(rating),1) FROM public.reviews WHERE counselor_id=b.counselor_id), reviews_count=(SELECT count(*) FROM public.reviews WHERE counselor_id=b.counselor_id) WHERE id=b.counselor_id;
  RETURN to_jsonb(r);
END $$;

-- These functions are server-only, including with historical explicit role grants.
REVOKE ALL ON FUNCTION public.consume_api_limit(TEXT,INTEGER,INTEGER), public.start_question_thread(TEXT,TEXT,UUID,TEXT), public.admin_update_booking(TEXT,TEXT,TEXT), public.admin_update_thread(UUID,TEXT), public.moderate_application(UUID,TEXT), public.create_booking_review(TEXT,UUID,INTEGER,TEXT), public.snapshot_thread_pricing(), public.set_counselor_commission_window() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_limit(TEXT,INTEGER,INTEGER), public.start_question_thread(TEXT,TEXT,UUID,TEXT), public.admin_update_booking(TEXT,TEXT,TEXT), public.admin_update_thread(UUID,TEXT), public.moderate_application(UUID,TEXT), public.create_booking_review(TEXT,UUID,INTEGER,TEXT) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
