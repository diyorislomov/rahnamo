-- ==============================================================================
-- Down Migration: 20261025_tracks_and_mentor_tracks_down.sql
-- Description: Revert tracks and mentor_tracks tables.
-- ==============================================================================

DROP TABLE IF EXISTS public.mentor_tracks CASCADE;
DROP TABLE IF EXISTS public.tracks CASCADE;
