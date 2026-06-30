-- Reparacion idempotente para bases que quedaron con migraciones de Serenatas parciales.
CREATE TABLE IF NOT EXISTS "serenata_clients" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "phone" varchar(40),
    "comuna" varchar(120),
    "region" varchar(120),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "serenata_owners" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "bio" text,
    "comuna" varchar(120),
    "region" varchar(120),
    "working_comunas" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "accepts_urgent" boolean DEFAULT false NOT NULL,
    "min_price" integer,
    "max_price" integer,
    "subscription_status" varchar(30) DEFAULT 'trialing' NOT NULL,
    "subscription_price" integer DEFAULT 19990 NOT NULL,
    "commission_rate_bps" integer DEFAULT 800 NOT NULL,
    "commission_vat_rate_bps" integer DEFAULT 1900 NOT NULL,
    "trial_ends_at" timestamp DEFAULT (now() + interval '14 days') NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "serenata_musicians"
    ADD COLUMN IF NOT EXISTS "instruments" jsonb DEFAULT '[]'::jsonb NOT NULL,
    ADD COLUMN IF NOT EXISTS "working_comunas" jsonb DEFAULT '[]'::jsonb NOT NULL,
    ADD COLUMN IF NOT EXISTS "available_now" boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "experience_years" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "serenata_provider_groups"
    ADD COLUMN IF NOT EXISTS "owner_id" uuid,
    ADD COLUMN IF NOT EXISTS "sla_hours" integer DEFAULT 24 NOT NULL,
    ADD COLUMN IF NOT EXISTS "booking_mode" varchar(30) DEFAULT 'manual' NOT NULL,
    ADD COLUMN IF NOT EXISTS "buffer_minutes" integer DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS "requires_advance_payment" boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "advance_payment_instructions" text,
    ADD COLUMN IF NOT EXISTS "accepts_cash" boolean DEFAULT true NOT NULL,
    ADD COLUMN IF NOT EXISTS "accepts_transfer" boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "accepts_mp" boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "accepts_payment_link" boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "payment_link_url" varchar(500),
    ADD COLUMN IF NOT EXISTS "bank_transfer_data" jsonb;
--> statement-breakpoint
ALTER TABLE "serenata_groups"
    ADD COLUMN IF NOT EXISTS "owner_id" uuid,
    ADD COLUMN IF NOT EXISTS "provider_group_id" uuid,
    ADD COLUMN IF NOT EXISTS "max_musicians" integer,
    ADD COLUMN IF NOT EXISTS "required_instruments" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "serenatas"
    ADD COLUMN IF NOT EXISTS "client_id" uuid,
    ADD COLUMN IF NOT EXISTS "owner_id" uuid,
    ADD COLUMN IF NOT EXISTS "provider_group_id" uuid,
    ADD COLUMN IF NOT EXISTS "selected_service_id" uuid,
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
CREATE UNIQUE INDEX IF NOT EXISTS "serenata_clients_user_idx" ON "serenata_clients" ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "serenata_owners_user_idx" ON "serenata_owners" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_provider_groups_owner_user_idx" ON "serenata_provider_groups" ("owner_user_id");
