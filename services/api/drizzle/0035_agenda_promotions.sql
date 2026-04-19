-- SimpleAgenda: promociones y cupones

CREATE TABLE IF NOT EXISTS agenda_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
  code varchar(40),
  label varchar(120) NOT NULL,
  description text,
  discount_type varchar(10) NOT NULL DEFAULT 'percent',
  discount_value decimal(10,2) NOT NULL,
  applies_to varchar(10) NOT NULL DEFAULT 'all',
  service_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  min_amount decimal(10,2),
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  starts_at timestamp,
  ends_at timestamp,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agenda_promotions_professional_idx
  ON agenda_promotions(professional_id);

CREATE UNIQUE INDEX IF NOT EXISTS agenda_promotions_code_unique_idx
  ON agenda_promotions(professional_id, lower(code))
  WHERE code IS NOT NULL;

-- Registro del descuento aplicado en la cita
ALTER TABLE agenda_appointments
  ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES agenda_promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promotion_code varchar(40),
  ADD COLUMN IF NOT EXISTS original_price decimal(10,2),
  ADD COLUMN IF NOT EXISTS discount_amount decimal(10,2);

CREATE INDEX IF NOT EXISTS agenda_appointments_promotion_idx
  ON agenda_appointments(promotion_id);
