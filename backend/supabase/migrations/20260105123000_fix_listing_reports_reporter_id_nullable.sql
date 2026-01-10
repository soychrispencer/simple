/*
  Hardening: si listing_reports.reporter_id quedó NOT NULL en el editor SQL,
  esto lo corrige de forma segura para permitir ON DELETE SET NULL.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listing_reports'
      AND column_name = 'reporter_id'
      AND is_nullable = 'NO'
  ) THEN
    EXECUTE 'ALTER TABLE public.listing_reports ALTER COLUMN reporter_id DROP NOT NULL';
  END IF;
END $$;
