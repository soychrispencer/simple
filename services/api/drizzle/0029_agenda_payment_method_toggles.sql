ALTER TABLE "agenda_professional_profiles"
  ADD COLUMN IF NOT EXISTS "accepts_transfer" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "accepts_mp" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "accepts_payment_link" boolean NOT NULL DEFAULT false;
