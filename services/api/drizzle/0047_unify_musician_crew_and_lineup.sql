-- Unificar música: lineup y cuadrilla apuntan a serenata_musicians (una sola tabla de músicos).
-- Reemplaza serenata_musician_profiles por serenata_coordinator_crew_memberships.

-- 1. Columnas opcionales en músicos canonical
ALTER TABLE "serenata_musicians" ADD COLUMN IF NOT EXISTS "instruments" varchar(255)[];--> statement-breakpoint
ALTER TABLE "serenata_musicians" ADD COLUMN IF NOT EXISTS "phone" varchar(50);--> statement-breakpoint
UPDATE "serenata_musicians" SET "instruments" = ARRAY["instrument"]::varchar(255)[] WHERE "instruments" IS NULL;--> statement-breakpoint

-- 2. Nueva tabla de membresía cuadrilla
CREATE TABLE IF NOT EXISTS "serenata_coordinator_crew_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"musician_id" uuid NOT NULL,
	"coordinator_profile_id" uuid NOT NULL,
	"membership_status" varchar(20) DEFAULT 'active' NOT NULL,
	"membership_initiator" varchar(20),
	"membership_invited_at" timestamp,
	"membership_responded_at" timestamp,
	"membership_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "serenata_coordinator_crew_memberships" ADD CONSTRAINT "serenata_crew_musician_fk"
	FOREIGN KEY ("musician_id") REFERENCES "public"."serenata_musicians"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "serenata_coordinator_crew_memberships" ADD CONSTRAINT "serenata_crew_coord_fk"
	FOREIGN KEY ("coordinator_profile_id") REFERENCES "public"."serenata_coordinator_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "serenata_crew_musician_coord_unique_idx"
	ON "serenata_coordinator_crew_memberships" USING btree ("musician_id","coordinator_profile_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_crew_coord_idx" ON "serenata_coordinator_crew_memberships" USING btree ("coordinator_profile_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_crew_musician_idx" ON "serenata_coordinator_crew_memberships" USING btree ("musician_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_crew_membership_status_idx" ON "serenata_coordinator_crew_memberships" USING btree ("membership_status");
--> statement-breakpoint

-- 3. Asegurar fila músico para cada usuario que solo existía como perfil legacy
INSERT INTO "serenata_musicians" ("user_id","instrument","instruments","bio","phone","experience","avatar_url","comuna","region","is_available","is_online","available_now","status","created_at","updated_at")
SELECT DISTINCT ON ("p"."user_id")
	"p"."user_id",
	COALESCE(
		NULLIF(trim(both FROM (
			CASE
				WHEN "p"."instruments" IS NOT NULL AND cardinality("p"."instruments") >= 1 THEN "p"."instruments"[1]::text
				ELSE ''
			END
		)), ''),
		'Voz'
	),
	"p"."instruments",
	"p"."bio",
	"p"."phone",
	NULL,
	NULL,
	NULL,
	NULL,
	true,
	false,
	false,
	'active',
	COALESCE("p"."created_at", now()),
	now()
FROM "serenata_musician_profiles" AS "p"
WHERE NOT EXISTS (SELECT 1 FROM "serenata_musicians" AS "m" WHERE "m"."user_id" = "p"."user_id")
ORDER BY "p"."user_id","p"."updated_at" DESC;
--> statement-breakpoint

-- 4. Fusionar texto/instrumentos desde perfiles legacy al músico canon
UPDATE "serenata_musicians" AS "m"
SET
	"instruments" = COALESCE("ms"."instruments", "m"."instruments"),
	"bio" = CASE WHEN COALESCE(trim(both FROM "m"."bio"), '') = '' THEN "ms"."bio" ELSE "m"."bio" END,
	"phone" = COALESCE("m"."phone","ms"."phone")
FROM (
	SELECT DISTINCT ON ("user_id") "user_id","instruments","bio","phone"
	FROM "serenata_musician_profiles"
	ORDER BY "user_id","updated_at" DESC
) AS "ms"
WHERE "m"."user_id" = "ms"."user_id";
--> statement-breakpoint

INSERT INTO "serenata_coordinator_crew_memberships" (
	"musician_id","coordinator_profile_id","membership_status","membership_initiator","membership_invited_at","membership_responded_at","membership_message","created_at","updated_at"
)
SELECT "m"."id","p"."coordinator_profile_id","p"."membership_status","p"."membership_initiator","p"."membership_invited_at","p"."membership_responded_at","p"."membership_message","p"."created_at","p"."updated_at"
FROM "serenata_musician_profiles" AS "p"
JOIN "serenata_musicians" AS "m" ON "m"."user_id" = "p"."user_id"
WHERE NOT EXISTS (
	SELECT 1 FROM "serenata_coordinator_crew_memberships" AS "x"
	WHERE "x"."musician_id" = "m"."id" AND "x"."coordinator_profile_id" = "p"."coordinator_profile_id"
);
--> statement-breakpoint

ALTER TABLE "serenata_musician_lineup" ADD COLUMN IF NOT EXISTS "canonical_musician_id" uuid;
--> statement-breakpoint
UPDATE "serenata_musician_lineup" AS "l"
SET "canonical_musician_id" = "m"."id"
FROM "serenata_musician_profiles" AS "p"
JOIN "serenata_musicians" AS "m" ON "m"."user_id" = "p"."user_id"
WHERE "p"."id" = "l"."musician_id";
--> statement-breakpoint

DELETE FROM "serenata_musician_lineup" WHERE "canonical_musician_id" IS NULL;
--> statement-breakpoint

ALTER TABLE "serenata_musician_lineup" DROP CONSTRAINT IF EXISTS "serenata_musician_lineup_musician_id_serenata_musician_profiles_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "musician_lineup_musician_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "musician_lineup_serenata_musician_unique_idx";
--> statement-breakpoint
ALTER TABLE "serenata_musician_lineup" DROP COLUMN "musician_id";
--> statement-breakpoint
ALTER TABLE "serenata_musician_lineup" RENAME COLUMN "canonical_musician_id" TO "musician_id";
--> statement-breakpoint

ALTER TABLE "serenata_musician_lineup" ALTER COLUMN "musician_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "serenata_musician_lineup" ADD CONSTRAINT "serenata_musician_lineup_musician_fk"
	FOREIGN KEY ("musician_id") REFERENCES "public"."serenata_musicians"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "musician_lineup_serenata_musician_unique_idx"
	ON "serenata_musician_lineup" USING btree ("serenata_id","musician_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "musician_lineup_musician_idx" ON "serenata_musician_lineup" USING btree ("musician_id");
--> statement-breakpoint

DROP TABLE IF EXISTS "serenata_musician_profiles" CASCADE;
--> statement-breakpoint
