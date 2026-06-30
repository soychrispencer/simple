-- Reparación idempotente: columnas Drizzle ausentes y renombres coordinator/admin → owner.

ALTER TABLE "serenatas"
    ADD COLUMN IF NOT EXISTS "client_id" uuid,
    ADD COLUMN IF NOT EXISTS "owner_id" uuid,
    ADD COLUMN IF NOT EXISTS "provider_group_id" uuid,
    ADD COLUMN IF NOT EXISTS "selected_service_id" uuid,
    ADD COLUMN IF NOT EXISTS "group_id" uuid,
    ADD COLUMN IF NOT EXISTS "source" varchar(30) DEFAULT 'own_lead' NOT NULL,
    ADD COLUMN IF NOT EXISTS "payment_status" varchar(30) DEFAULT 'not_required' NOT NULL,
    ADD COLUMN IF NOT EXISTS "payment_order_id" varchar(120),
    ADD COLUMN IF NOT EXISTS "paid_at" timestamp,
    ADD COLUMN IF NOT EXISTS "package_code" varchar(30),
    ADD COLUMN IF NOT EXISTS "flexible_schedule" boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "completed_at" timestamp,
    ADD COLUMN IF NOT EXISTS "completed_by" uuid,
    ADD COLUMN IF NOT EXISTS "cancel_reason" text,
    ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp,
    ADD COLUMN IF NOT EXISTS "cancelled_by" uuid,
    ADD COLUMN IF NOT EXISTS "client_confirmed_at" timestamp,
    ADD COLUMN IF NOT EXISTS "closure_reminder_sent_at" timestamp,
    ADD COLUMN IF NOT EXISTS "response_due_at" timestamptz,
    ADD COLUMN IF NOT EXISTS "expired_at" timestamptz,
    ADD COLUMN IF NOT EXISTS "expired_reason" varchar(40),
    ADD COLUMN IF NOT EXISTS "pending_reminder_sent_at" timestamptz;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenatas' AND column_name = 'coordinator_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenatas' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE "serenatas" RENAME COLUMN "coordinator_id" TO "owner_id";
  ELSIF EXISTS (
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
    WHERE table_schema = 'public' AND table_name = 'serenata_offers' AND column_name = 'coordinator_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_offers' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE "serenata_offers" RENAME COLUMN "coordinator_id" TO "owner_id";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_offers' AND column_name = 'admin_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_offers' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE "serenata_offers" RENAME COLUMN "admin_id" TO "owner_id";
  END IF;
END $$;
