ALTER TABLE "serenata_musicians" ADD COLUMN IF NOT EXISTS "working_comunas" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "serenata_musicians"
SET "working_comunas" = jsonb_build_array("comuna")
WHERE "comuna" IS NOT NULL
	AND ("working_comunas" IS NULL OR "working_comunas" = '[]'::jsonb);
