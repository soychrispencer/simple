-- Reparación serenata_groups: columnas Drizzle y migración coordinator/admin → owner_id.

ALTER TABLE "serenata_groups"
    ADD COLUMN IF NOT EXISTS "owner_id" uuid,
    ADD COLUMN IF NOT EXISTS "provider_group_id" uuid,
    ADD COLUMN IF NOT EXISTS "max_musicians" integer,
    ADD COLUMN IF NOT EXISTS "required_instruments" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint

ALTER TABLE "serenata_group_members"
    ADD COLUMN IF NOT EXISTS "slot_index" integer;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_groups' AND column_name = 'coordinator_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_groups' AND column_name = 'owner_id'
  ) THEN
    UPDATE "serenata_groups" SET "owner_id" = "coordinator_id" WHERE "owner_id" IS NULL;
    ALTER TABLE "serenata_groups" DROP CONSTRAINT IF EXISTS "serenata_groups_coordinator_id_serenata_coordinators_id_fk";
    ALTER TABLE "serenata_groups" DROP COLUMN IF EXISTS "coordinator_id";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_groups' AND column_name = 'coordinator_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_groups' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE "serenata_groups" RENAME COLUMN "coordinator_id" TO "owner_id";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_groups' AND column_name = 'admin_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_groups' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE "serenata_groups" RENAME COLUMN "admin_id" TO "owner_id";
  END IF;
END $$;
