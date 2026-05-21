-- Elimina columnas legacy de serenata_groups (esquema pre-0041) que rompen INSERT con Drizzle.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_groups' AND column_name = 'created_by'
  ) THEN
    UPDATE "serenata_groups" g
    SET "created_by" = o."user_id"
    FROM "serenata_owners" o
    WHERE g."owner_id" = o."id" AND g."created_by" IS NULL;

    ALTER TABLE "serenata_groups" ALTER COLUMN "created_by" DROP NOT NULL;
    ALTER TABLE "serenata_groups" DROP COLUMN IF EXISTS "created_by";
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "serenata_groups" DROP COLUMN IF EXISTS "description";
--> statement-breakpoint
ALTER TABLE "serenata_groups" DROP COLUMN IF EXISTS "lat";
--> statement-breakpoint
ALTER TABLE "serenata_groups" DROP COLUMN IF EXISTS "lng";
--> statement-breakpoint
ALTER TABLE "serenata_groups" DROP COLUMN IF EXISTS "budget_min";
--> statement-breakpoint
ALTER TABLE "serenata_groups" DROP COLUMN IF EXISTS "budget_max";
--> statement-breakpoint
ALTER TABLE "serenata_groups" DROP COLUMN IF EXISTS "price";
