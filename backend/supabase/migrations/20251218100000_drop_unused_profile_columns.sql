-- Drop unused columns from profiles (region_id, commune_id, is_staff, default_vertical)
-- Fecha: 18-12-2025
-- Rationale: Location moves to profile_addresses; staff/default_vertical unused.

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS region_id,
  DROP COLUMN IF EXISTS commune_id,
  DROP COLUMN IF EXISTS is_staff,
  DROP COLUMN IF EXISTS default_vertical;
