-- Add body-type scoping to features_catalog (used by Paso 3 "Equipamiento")
-- Guard: some environments may not have this table yet.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'features_catalog'
  ) THEN
    ALTER TABLE public.features_catalog
      ADD COLUMN IF NOT EXISTS allowed_body_types text[] NULL;

    -- Helps filtering by body type when needed
    CREATE INDEX IF NOT EXISTS features_catalog_allowed_body_types_gin
      ON public.features_catalog
      USING gin (allowed_body_types);
  END IF;
END $$;
