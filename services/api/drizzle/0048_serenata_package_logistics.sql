ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "package_code" varchar(30);
--> statement-breakpoint
UPDATE "serenatas"
SET "package_code" = CASE
    WHEN lower("event_type") LIKE '%duo%' OR lower("event_type") LIKE '%dúo%' THEN 'duo'
    WHEN lower("event_type") LIKE '%trio%' OR lower("event_type") LIKE '%trío%' THEN 'trio'
    WHEN lower("event_type") LIKE '%cuarteto%' THEN 'cuarteto'
    WHEN lower("event_type") LIKE '%premium%' OR lower("event_type") LIKE '%quinteto%' THEN 'quinteto'
    ELSE "package_code"
END
WHERE "package_code" IS NULL;
