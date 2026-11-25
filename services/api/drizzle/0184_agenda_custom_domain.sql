ALTER TABLE "agenda_professional_profiles"
    ADD COLUMN IF NOT EXISTS "custom_domain" varchar(255),
    ADD COLUMN IF NOT EXISTS "custom_domain_status" varchar(20) NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS "custom_domain_verified_at" timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS "agenda_profiles_custom_domain_idx"
    ON "agenda_professional_profiles" ("custom_domain")
    WHERE "custom_domain" IS NOT NULL;
