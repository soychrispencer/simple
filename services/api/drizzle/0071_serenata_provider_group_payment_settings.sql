-- Métodos de pago y anticipo por grupo (mariachi)
ALTER TABLE serenata_provider_groups
  ADD COLUMN IF NOT EXISTS requires_advance_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS advance_payment_instructions text,
  ADD COLUMN IF NOT EXISTS accepts_cash boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepts_transfer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepts_mp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepts_payment_link boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_link_url varchar(500),
  ADD COLUMN IF NOT EXISTS bank_transfer_data jsonb;
