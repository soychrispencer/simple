DO $$
BEGIN
  IF to_regclass('public.serenata_admins') IS NULL
     AND to_regclass('public.serenata_coordinators') IS NOT NULL THEN
    ALTER TABLE "serenata_coordinators" RENAME TO "serenata_admins";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF to_regclass('public.serenata_coordinators_user_idx') IS NOT NULL
     AND to_regclass('public.serenata_admins_user_idx') IS NULL THEN
    ALTER INDEX "serenata_coordinators_user_idx" RENAME TO "serenata_admins_user_idx";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'serenata_coordinators_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "serenata_admins"
      RENAME CONSTRAINT "serenata_coordinators_user_id_users_id_fk"
      TO "serenata_admins_user_id_users_id_fk";
  END IF;
END $$;
--> statement-breakpoint

DROP VIEW IF EXISTS "serenata_coordinators";
--> statement-breakpoint

CREATE VIEW "serenata_coordinators" AS
SELECT
  "id",
  "user_id",
  "bio",
  "comuna",
  "region",
  "working_comunas",
  "accepts_urgent",
  "min_price",
  "max_price",
  "subscription_status",
  "subscription_price",
  "commission_rate_bps",
  "commission_vat_rate_bps",
  "trial_ends_at",
  "created_at",
  "updated_at"
FROM "serenata_admins";
