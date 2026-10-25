-- Migration: 20261025_mentor_onboarding_phase2_4_6.sql
-- Description: Add proof_link & consent_published to counselor_applications, is_active to counselors, and platform_settings table.

-- 1. Phase 2: Counselor Applications Improvements
ALTER TABLE public.counselor_applications
  ADD COLUMN IF NOT EXISTS proof_link TEXT,
  ADD COLUMN IF NOT EXISTS consent_published TIMESTAMP WITH TIME ZONE;

-- 2. Phase 4: Counselor Activation / Pause Control
ALTER TABLE public.counselors
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Ensure an index on is_active for public catalog filtering
CREATE INDEX IF NOT EXISTS idx_counselors_is_active ON public.counselors(is_active);

-- 3. Phase 6: Platform Settings (for Global Launch Date & dynamic configuration)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default global launch date if not already present
INSERT INTO public.platform_settings (key, value)
VALUES ('global_launch_date', '"2026-11-01T00:00:00.000Z"'::jsonb)
ON CONFLICT (key) DO NOTHING;
