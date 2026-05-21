ALTER TABLE "serenata_musicians"
    ADD COLUMN IF NOT EXISTS "has_instrument" boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "has_mariachi_attire" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

UPDATE "serenata_musicians"
SET "has_instrument" = true
WHERE "has_instrument" = false
  AND (
    NULLIF(TRIM(COALESCE("instrument", '')), '') IS NOT NULL
    OR COALESCE(jsonb_array_length("instruments"), 0) > 0
  );
