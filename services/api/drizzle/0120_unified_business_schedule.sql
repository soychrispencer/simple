ALTER TABLE "serenata_availability_rules" ADD COLUMN IF NOT EXISTS "break_start" varchar(5);--> statement-breakpoint
ALTER TABLE "serenata_availability_rules" ADD COLUMN IF NOT EXISTS "break_end" varchar(5);--> statement-breakpoint
ALTER TABLE "agenda_professional_profiles" ADD COLUMN IF NOT EXISTS "always_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agenda_professional_profiles" ADD COLUMN IF NOT EXISTS "schedule_note" varchar(255);--> statement-breakpoint
ALTER TABLE "serenata_provider_groups" ADD COLUMN IF NOT EXISTS "always_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "serenata_provider_groups" ADD COLUMN IF NOT EXISTS "schedule_note" varchar(255);--> statement-breakpoint
ALTER TABLE "public_profiles" ADD COLUMN IF NOT EXISTS "weekly_break_start" varchar(5);--> statement-breakpoint
ALTER TABLE "public_profiles" ADD COLUMN IF NOT EXISTS "weekly_break_end" varchar(5);--> statement-breakpoint
ALTER TABLE "public_profiles" ADD COLUMN IF NOT EXISTS "schedule_blocked_slots" jsonb DEFAULT '[]'::jsonb NOT NULL;
