-- Programa de referidos: un cliente recomienda a un conocido.
ALTER TABLE "agenda_clients"
    ADD COLUMN IF NOT EXISTS "referred_by_client_id" uuid REFERENCES "agenda_clients"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "agenda_referrals" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "professional_id" uuid NOT NULL REFERENCES "agenda_professional_profiles"("id") ON DELETE CASCADE,
    "referrer_client_id" uuid NOT NULL REFERENCES "agenda_clients"("id") ON DELETE CASCADE,
    "referee_client_id" uuid REFERENCES "agenda_clients"("id") ON DELETE SET NULL,
    "referee_name" varchar(200),
    "referee_phone" varchar(40),
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "reward_note" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "converted_at" timestamp,
    "rewarded_at" timestamp
);

CREATE INDEX IF NOT EXISTS "agenda_referrals_professional_idx" ON "agenda_referrals"("professional_id");
CREATE INDEX IF NOT EXISTS "agenda_referrals_referrer_idx" ON "agenda_referrals"("referrer_client_id");
CREATE INDEX IF NOT EXISTS "agenda_referrals_status_idx" ON "agenda_referrals"("status");
