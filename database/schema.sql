CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT,
  UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions ("userId");
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts ("userId");

CREATE TABLE IF NOT EXISTS counselor_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  service_type TEXT NOT NULL DEFAULT 'career_session' CHECK (
    service_type IN ('quick_call', 'career_session', 'cv_review', 'mock_interview', 'grant_guidance', 'monthly_mentorship', 'custom')
  ),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 15 AND 180),
  price INTEGER NOT NULL CHECK (price > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS counselor_services_public_idx
  ON counselor_services (counselor_id, active, created_at);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counselor_id TEXT NOT NULL,
  counselor_name TEXT NOT NULL,
  counselor_headline TEXT NOT NULL,
  counselor_avatar TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('standard', 'premium', 'text_qa', 'service')),
  service_id UUID REFERENCES counselor_services(id) ON DELETE SET NULL,
  service_title TEXT,
  duration_minutes INTEGER,
  price INTEGER NOT NULL CHECK (price >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('payme', 'click', 'uzum')),
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_receipt TEXT,
  slot TEXT NOT NULL,
  student_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  telegram TEXT NOT NULL,
  education TEXT NOT NULL,
  question TEXT NOT NULL,
  meet_link TEXT,
  locale TEXT NOT NULL DEFAULT 'uz',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES counselor_services(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_title TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_tier_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_tier_check
  CHECK (tier IN ('standard', 'premium', 'text_qa', 'service'));

DROP INDEX IF EXISTS bookings_one_active_slot;
CREATE UNIQUE INDEX bookings_one_active_slot
  ON bookings (counselor_id, slot)
  WHERE tier IN ('standard', 'premium', 'service') AND status = 'confirmed';
CREATE INDEX IF NOT EXISTS bookings_user_created_idx ON bookings (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counselor_id TEXT NOT NULL,
  student_first_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL CHECK (char_length(review_text) BETWEEN 10 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS question_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  counselor_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price_per_question INTEGER NOT NULL CHECK (price_per_question > 0),
  soft_cap INTEGER,
  questions_used INTEGER NOT NULL DEFAULT 0,
  total_owed INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'active' CHECK (payment_status IN ('active', 'awaiting_payment', 'closed')),
  payment_receipt TEXT,
  age_confirmed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS question_threads_one_open
  ON question_threads (user_id, counselor_id)
  WHERE payment_status <> 'closed';

CREATE TABLE IF NOT EXISTS thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES question_threads(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('student', 'counselor')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS thread_messages_thread_created_idx ON thread_messages (thread_id, created_at);
