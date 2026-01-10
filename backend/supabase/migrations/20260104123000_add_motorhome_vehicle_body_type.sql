-- Adds missing enum value used by frontend (wizard): 'motorhome'
-- This fixes: invalid input value for enum vehicle_body_type: "motorhome"

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'vehicle_body_type'
      AND e.enumlabel = 'motorhome'
  ) THEN
    ALTER TYPE public.vehicle_body_type ADD VALUE 'motorhome';
  END IF;
END $$;
