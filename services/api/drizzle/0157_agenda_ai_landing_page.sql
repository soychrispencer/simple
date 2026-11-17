ALTER TABLE "agenda_professional_profiles"
  ADD COLUMN IF NOT EXISTS "operator_site_landing_config" jsonb NOT NULL DEFAULT '{"version":1,"brief":{"audience":"","differentiators":"","credentials":"","tone":"profesional"},"draft":null,"published":null}'::jsonb;
