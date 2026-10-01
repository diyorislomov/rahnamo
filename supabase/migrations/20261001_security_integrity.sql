-- Rahnamo security and integrity hardening.
-- Apply after supabase/schema.sql on an existing project.

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_row public.api_rate_limits;
BEGIN
  IF p_key IS NULL OR length(p_key) > 300 OR p_limit < 1 OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  IF random() < 0.01 THEN
    DELETE FROM public.api_rate_limits WHERE reset_at < now() - interval '1 day';
  END IF;

  INSERT INTO public.api_rate_limits (key, request_count, reset_at)
  VALUES (p_key, 0, now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO NOTHING;

  SELECT * INTO current_row FROM public.api_rate_limits WHERE key = p_key FOR UPDATE;
  IF current_row.reset_at <= now() THEN
    UPDATE public.api_rate_limits
    SET request_count = 1, reset_at = now() + make_interval(secs => p_window_seconds)
    WHERE key = p_key;
    RETURN true;
  END IF;
  IF current_row.request_count >= p_limit THEN
    RETURN false;
  END IF;

  UPDATE public.api_rate_limits SET request_count = request_count + 1 WHERE key = p_key;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_api_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- Client roles may read the public mentor catalog, but mentor creation is
-- exclusively an admin service-role operation.
DROP POLICY IF EXISTS "Allow public insert counselors" ON public.counselors;
REVOKE INSERT ON public.counselors FROM anon, authenticated;
REVOKE SELECT, UPDATE ON public.counselors FROM anon, authenticated;
GRANT SELECT (
  id, full_name, headline, avatar_url, specialties, bio, standard_price,
  premium_price, rating, reviews_count, available_slots, company,
  why_work_with_me, joined_at, commission_free_until, price_per_question,
  soft_cap
) ON public.counselors TO anon, authenticated;

-- Applications and survey responses contain contact details. All access now
-- goes through rate-limited server routes or authenticated admin routes.
DROP POLICY IF EXISTS "Allow public insert applications" ON public.counselor_applications;
DROP POLICY IF EXISTS "Allow public read applications" ON public.counselor_applications;
DROP POLICY IF EXISTS "Allow public update applications" ON public.counselor_applications;
DROP POLICY IF EXISTS "Allow public delete applications" ON public.counselor_applications;
REVOKE ALL ON public.counselor_applications FROM anon, authenticated;

DROP POLICY IF EXISTS "Allow public insert survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Allow public read survey responses" ON public.survey_responses;
REVOKE ALL ON public.survey_responses FROM anon, authenticated;

-- Forum rows are exposed through a server endpoint which omits author email.
DROP POLICY IF EXISTS "Allow public read forum questions" ON public.forum_questions;
DROP POLICY IF EXISTS "Allow public insert forum questions" ON public.forum_questions;
DROP POLICY IF EXISTS "Allow public read forum answers" ON public.forum_answers;
DROP POLICY IF EXISTS "Allow public insert forum answers" ON public.forum_answers;
REVOKE ALL ON public.forum_questions FROM anon, authenticated;
REVOKE ALL ON public.forum_answers FROM anon, authenticated;

-- All booking creation now goes through /api/bookings or the server-side
-- Text Q&A start routine. Remove every known historical permissive policy.
DROP POLICY IF EXISTS "Allow public read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can create a booking" ON public.bookings;
DROP POLICY IF EXISTS "Mentees insert their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Text Q&A booking insert" ON public.bookings;
REVOKE INSERT, UPDATE, DELETE ON public.bookings FROM anon, authenticated;
REVOKE SELECT ON public.bookings FROM anon;
GRANT SELECT ON public.bookings TO authenticated;

-- Only one active video booking may occupy a mentor's advertised slot.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY counselor_id, slot ORDER BY created_at, id) AS position
  FROM public.bookings
  WHERE tier IN ('standard', 'premium') AND status = 'confirmed'
)
UPDATE public.bookings SET status = 'cancelled'
WHERE id IN (SELECT id FROM ranked WHERE position > 1);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_slot
  ON public.bookings (counselor_id, slot)
  WHERE tier IN ('standard', 'premium') AND status = 'confirmed';

-- One review and one text thread per source booking.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY booking_id ORDER BY created_at, id) AS position
  FROM public.reviews
)
DELETE FROM public.reviews WHERE id IN (SELECT id FROM ranked WHERE position > 1);

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY booking_id ORDER BY created_at, id) AS position
  FROM public.question_threads
)
DELETE FROM public.question_threads WHERE id IN (SELECT id FROM ranked WHERE position > 1);

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY student_auth_id, counselor_id ORDER BY created_at DESC, id) AS position
  FROM public.question_threads
  WHERE payment_status <> 'closed'
)
UPDATE public.question_threads
SET payment_status = 'closed', closed_at = COALESCE(closed_at, now())
WHERE id IN (SELECT id FROM ranked WHERE position > 1);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_booking ON public.reviews (booking_id);
CREATE UNIQUE INDEX IF NOT EXISTS question_threads_one_per_booking ON public.question_threads (booking_id);
CREATE UNIQUE INDEX IF NOT EXISTS question_threads_one_open_per_pair
  ON public.question_threads (student_auth_id, counselor_id)
  WHERE payment_status <> 'closed';

-- Remove client-side counter/message bypasses. Receipts remain owner-writable;
-- question insertion and billing happen only inside the locked RPC below.
DROP POLICY IF EXISTS "Students can create their own threads" ON public.question_threads;
DROP POLICY IF EXISTS "Students can ask questions in their own threads" ON public.thread_messages;
REVOKE INSERT ON public.question_threads FROM anon, authenticated;
REVOKE UPDATE ON public.question_threads FROM anon, authenticated;
GRANT UPDATE (payment_receipt) ON public.question_threads TO authenticated;
REVOKE INSERT ON public.thread_messages FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.ask_thread_question(p_thread_id UUID, p_body TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread public.question_threads;
  v_new_count INTEGER;
  v_new_total INTEGER;
BEGIN
  IF p_body IS NULL OR length(trim(p_body)) = 0 OR length(trim(p_body)) > 4000 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_body');
  END IF;

  SELECT * INTO v_thread
  FROM public.question_threads
  WHERE id = p_thread_id AND student_auth_id = auth.uid()
  FOR UPDATE;

  IF v_thread IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;
  IF v_thread.payment_status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'awaiting_payment');
  END IF;

  v_new_count := v_thread.questions_used + 1;
  v_new_total := v_new_count * v_thread.price_per_question;

  INSERT INTO public.thread_messages (thread_id, sender_role, body)
  VALUES (p_thread_id, 'student', trim(p_body));

  UPDATE public.question_threads
  SET questions_used = v_new_count, total_owed = v_new_total
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

-- Keep catalog aggregates consistent with the canonical reviews table.
CREATE OR REPLACE FUNCTION public.refresh_counselor_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counselor_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_counselor_id := OLD.counselor_id;
  ELSE
    v_counselor_id := NEW.counselor_id;
  END IF;
  UPDATE public.counselors
  SET rating = COALESCE((SELECT round(avg(rating)::numeric, 1) FROM public.reviews WHERE counselor_id = v_counselor_id), 5.0),
      reviews_count = (SELECT count(*) FROM public.reviews WHERE counselor_id = v_counselor_id)
  WHERE id = v_counselor_id;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_refresh_counselor_rating ON public.reviews;
CREATE TRIGGER trg_refresh_counselor_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_counselor_rating();

-- Application uploads are handled by a server route after MIME/size checks.
DROP POLICY IF EXISTS "app photo upload" ON storage.objects;
DROP POLICY IF EXISTS "mentor own photo" ON storage.objects;

-- Data-domain checks added idempotently.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'counselor_prices_positive') THEN
    UPDATE public.counselors
    SET standard_price = GREATEST(standard_price, 1),
        premium_price = GREATEST(premium_price, 1),
        price_per_question = CASE WHEN price_per_question IS NOT NULL AND price_per_question <= 0 THEN NULL ELSE price_per_question END;
    ALTER TABLE public.counselors ADD CONSTRAINT counselor_prices_positive
      CHECK (standard_price > 0 AND premium_price > 0 AND (price_per_question IS NULL OR price_per_question > 0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'counselor_soft_cap_positive') THEN
    UPDATE public.counselors SET soft_cap = NULL WHERE soft_cap IS NOT NULL AND soft_cap <= 0;
    ALTER TABLE public.counselors ADD CONSTRAINT counselor_soft_cap_positive
      CHECK (soft_cap IS NULL OR soft_cap > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_price_nonnegative') THEN
    UPDATE public.bookings SET price = 0 WHERE price < 0;
    ALTER TABLE public.bookings ADD CONSTRAINT booking_price_nonnegative CHECK (price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_payment_status_valid') THEN
    UPDATE public.bookings SET payment_status = 'pending'
    WHERE payment_status NOT IN ('pending', 'confirmed', 'rejected') OR payment_status IS NULL;
    ALTER TABLE public.bookings ADD CONSTRAINT booking_payment_status_valid
      CHECK (payment_status IN ('pending', 'confirmed', 'rejected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_status_valid') THEN
    UPDATE public.bookings SET status = 'confirmed'
    WHERE status NOT IN ('confirmed', 'completed', 'cancelled') OR status IS NULL;
    ALTER TABLE public.bookings ADD CONSTRAINT booking_status_valid
      CHECK (status IN ('confirmed', 'completed', 'cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_text_length_valid') THEN
    UPDATE public.reviews
    SET review_text = CASE WHEN length(trim(review_text)) = 0 THEN 'No comment' ELSE left(review_text, 2000) END,
        student_first_name = CASE WHEN length(trim(student_first_name)) = 0 THEN 'Anonymous' ELSE left(student_first_name, 120) END;
    ALTER TABLE public.reviews ADD CONSTRAINT review_text_length_valid
      CHECK (length(review_text) BETWEEN 1 AND 2000 AND length(student_first_name) BETWEEN 1 AND 120);
  END IF;
END $$;
