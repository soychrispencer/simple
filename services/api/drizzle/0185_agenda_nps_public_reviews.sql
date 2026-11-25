ALTER TABLE "agenda_nps_responses"
    ADD COLUMN IF NOT EXISTS "rating_stars" integer,
    ADD COLUMN IF NOT EXISTS "public_consent" boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT false;
