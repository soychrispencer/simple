ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "response_due_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "expired_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "expired_reason" varchar(40);
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "pending_reminder_sent_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "serenata_provider_groups" ADD COLUMN IF NOT EXISTS "sla_hours" integer NOT NULL DEFAULT 24;
--> statement-breakpoint
ALTER TABLE "serenata_provider_groups" ADD COLUMN IF NOT EXISTS "booking_mode" varchar(30) NOT NULL DEFAULT 'manual';
