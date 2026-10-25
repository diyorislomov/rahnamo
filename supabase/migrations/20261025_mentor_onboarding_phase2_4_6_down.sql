-- Reversible down migration: 20261025_mentor_onboarding_phase2_4_6_down.sql

ALTER TABLE public.counselor_applications
  DROP COLUMN IF EXISTS proof_link,
  DROP COLUMN IF EXISTS consent_published;

DROP INDEX IF EXISTS public.idx_counselors_is_active;

ALTER TABLE public.counselors
  DROP COLUMN IF EXISTS is_active;

DROP TABLE IF EXISTS public.platform_settings;
