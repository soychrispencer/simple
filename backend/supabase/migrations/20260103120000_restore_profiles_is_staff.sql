-- Restore profiles.is_staff (needed by SimpleAdmin staff gate)
-- Fecha: 03-01-2026

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_staff boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_staff IS 'Global staff/admin flag for SimpleAdmin access.';

-- Prevent regular users from self-escalating via column-level privileges.
-- (Service role bypasses RLS and can update this.)
REVOKE UPDATE (is_staff) ON TABLE public.profiles FROM anon;
REVOKE UPDATE (is_staff) ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (is_staff) ON TABLE public.profiles TO service_role;
