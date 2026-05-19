-- Renombra perfil dueño de negocio (serenata_admins → serenata_owners) y FK admin_id → owner_id.

DO $$
BEGIN
  IF to_regclass('public.serenata_owners') IS NULL
     AND to_regclass('public.serenata_admins') IS NOT NULL THEN
    ALTER TABLE "serenata_admins" RENAME TO "serenata_owners";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF to_regclass('public.serenata_coordinators') IS NOT NULL
     AND to_regclass('public.serenata_owners') IS NULL THEN
    ALTER TABLE "serenata_coordinators" RENAME TO "serenata_owners";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF to_regclass('public.serenata_coordinators_user_idx') IS NOT NULL
     AND to_regclass('public.serenata_owners_user_idx') IS NULL THEN
    ALTER INDEX "serenata_coordinators_user_idx" RENAME TO "serenata_owners_user_idx";
  END IF;
  IF to_regclass('public.serenata_admins_user_idx') IS NOT NULL
     AND to_regclass('public.serenata_owners_user_idx') IS NULL THEN
    ALTER INDEX "serenata_admins_user_idx" RENAME TO "serenata_owners_user_idx";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'serenata_admins_user_id_users_id_fk') THEN
    ALTER TABLE "serenata_owners"
      RENAME CONSTRAINT "serenata_admins_user_id_users_id_fk"
      TO "serenata_owners_user_id_users_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'serenata_coordinators_user_id_users_id_fk') THEN
    ALTER TABLE "serenata_owners"
      RENAME CONSTRAINT "serenata_coordinators_user_id_users_id_fk"
      TO "serenata_owners_user_id_users_id_fk";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_provider_groups' AND column_name = 'admin_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_provider_groups' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE "serenata_provider_groups" RENAME COLUMN "admin_id" TO "owner_id";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_groups' AND column_name = 'admin_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_groups' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE "serenata_groups" RENAME COLUMN "admin_id" TO "owner_id";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenatas' AND column_name = 'admin_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenatas' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE "serenatas" RENAME COLUMN "admin_id" TO "owner_id";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_offers' AND column_name = 'admin_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_offers' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE "serenata_offers" RENAME COLUMN "admin_id" TO "owner_id";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF to_regclass('public.serenata_provider_groups_admin_idx') IS NOT NULL
     AND to_regclass('public.serenata_provider_groups_owner_idx') IS NULL THEN
    ALTER INDEX "serenata_provider_groups_admin_idx" RENAME TO "serenata_provider_groups_owner_idx";
  END IF;
  IF to_regclass('public.serenata_groups_admin_idx') IS NOT NULL
     AND to_regclass('public.serenata_groups_owner_idx') IS NULL THEN
    ALTER INDEX "serenata_groups_admin_idx" RENAME TO "serenata_groups_owner_idx";
  END IF;
  IF to_regclass('public.serenatas_admin_idx') IS NOT NULL
     AND to_regclass('public.serenatas_owner_idx') IS NULL THEN
    ALTER INDEX "serenatas_admin_idx" RENAME TO "serenatas_owner_idx";
  END IF;
  IF to_regclass('public.serenata_offers_admin_idx') IS NOT NULL
     AND to_regclass('public.serenata_offers_owner_idx') IS NULL THEN
    ALTER INDEX "serenata_offers_admin_idx" RENAME TO "serenata_offers_owner_idx";
  END IF;
  IF to_regclass('public.serenata_offers_unique_admin_idx') IS NOT NULL
     AND to_regclass('public.serenata_offers_unique_owner_idx') IS NULL THEN
    ALTER INDEX "serenata_offers_unique_admin_idx" RENAME TO "serenata_offers_unique_owner_idx";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'serenata_provider_groups_admin_id_serenata_admins_id_fk') THEN
    ALTER TABLE "serenata_provider_groups"
      RENAME CONSTRAINT "serenata_provider_groups_admin_id_serenata_admins_id_fk"
      TO "serenata_provider_groups_owner_id_serenata_owners_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'serenata_provider_groups_coordinator_id_serenata_coordinators_id_fk') THEN
    ALTER TABLE "serenata_provider_groups"
      RENAME CONSTRAINT "serenata_provider_groups_coordinator_id_serenata_coordinators_id_fk"
      TO "serenata_provider_groups_owner_id_serenata_owners_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'serenata_groups_admin_id_serenata_admins_id_fk') THEN
    ALTER TABLE "serenata_groups"
      RENAME CONSTRAINT "serenata_groups_admin_id_serenata_admins_id_fk"
      TO "serenata_groups_owner_id_serenata_owners_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'serenata_groups_coordinator_id_serenata_coordinators_id_fk') THEN
    ALTER TABLE "serenata_groups"
      RENAME CONSTRAINT "serenata_groups_coordinator_id_serenata_coordinators_id_fk"
      TO "serenata_groups_owner_id_serenata_owners_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'serenatas_admin_id_serenata_admins_id_fk') THEN
    ALTER TABLE "serenatas"
      RENAME CONSTRAINT "serenatas_admin_id_serenata_admins_id_fk"
      TO "serenatas_owner_id_serenata_owners_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'serenatas_coordinator_id_serenata_coordinators_id_fk') THEN
    ALTER TABLE "serenatas"
      RENAME CONSTRAINT "serenatas_coordinator_id_serenata_coordinators_id_fk"
      TO "serenatas_owner_id_serenata_owners_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'serenata_offers_admin_id_serenata_admins_id_fk') THEN
    ALTER TABLE "serenata_offers"
      RENAME CONSTRAINT "serenata_offers_admin_id_serenata_admins_id_fk"
      TO "serenata_offers_owner_id_serenata_owners_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'serenata_offers_coordinator_id_serenata_coordinators_id_fk') THEN
    ALTER TABLE "serenata_offers"
      RENAME CONSTRAINT "serenata_offers_coordinator_id_serenata_coordinators_id_fk"
      TO "serenata_offers_owner_id_serenata_owners_id_fk";
  END IF;
END $$;
