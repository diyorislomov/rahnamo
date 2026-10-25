-- ==============================================================================
-- Migration: 20261025_privacy_and_data_minimization.sql
-- Description: Mentee data minimization, privacy consent, under-18 protection, and account deletion support.
-- ==============================================================================

-- 1. Profiles Table Enhancements
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS education_stage text CHECK (education_stage IN ('school', 'university', 'working', 'other')),
  ADD COLUMN IF NOT EXISTS is_under_18 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parental_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS telegram text,
  ADD COLUMN IF NOT EXISTS goal text,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'uz',
  ADD COLUMN IF NOT EXISTS privacy_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_policy_version text DEFAULT 'v1.0';

-- 2. Bookings Table Enhancements for Data Minimization & Minor Protection
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS education_stage text,
  ADD COLUMN IF NOT EXISTS is_under_18 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parental_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS privacy_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_consent_at timestamptz;

-- Make phone column nullable if it has not-null constraint
ALTER TABLE public.bookings ALTER COLUMN phone DROP NOT NULL;

-- 3. Platform Settings for Under-18 Policy
INSERT INTO public.platform_settings (key, value)
VALUES (
  'under_18_policy',
  '{"require_parental_consent": true, "allow_1on1_sessions": true, "minimum_age": 14, "updated_at": "2026-10-25T16:30:00Z"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 4. RLS Hardening for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id OR auth.role() = 'service_role');
