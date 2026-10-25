-- ==============================================================================
-- Down Migration: 20261025_privacy_and_data_minimization_down.sql
-- Description: Revert mentee privacy and data minimization columns.
-- ==============================================================================

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS education_stage,
  DROP COLUMN IF EXISTS is_under_18,
  DROP COLUMN IF EXISTS parental_consent,
  DROP COLUMN IF EXISTS region,
  DROP COLUMN IF EXISTS telegram,
  DROP COLUMN IF EXISTS goal,
  DROP COLUMN IF EXISTS preferred_language,
  DROP COLUMN IF EXISTS privacy_consent,
  DROP COLUMN IF EXISTS privacy_consent_at,
  DROP COLUMN IF EXISTS privacy_policy_version;

ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS education_stage,
  DROP COLUMN IF EXISTS is_under_18,
  DROP COLUMN IF EXISTS parental_consent,
  DROP COLUMN IF EXISTS region,
  DROP COLUMN IF EXISTS privacy_consent,
  DROP COLUMN IF EXISTS privacy_consent_at;
