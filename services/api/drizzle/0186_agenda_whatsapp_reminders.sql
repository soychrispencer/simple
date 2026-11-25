ALTER TABLE "agenda_professional_profiles" ADD COLUMN IF NOT EXISTS "whatsapp_reminders_enabled" boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE "agenda_professional_profiles" ADD COLUMN IF NOT EXISTS "whatsapp_extra_credits" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "agenda_appointments" ADD COLUMN IF NOT EXISTS "whatsapp_reminder_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "agenda_appointments" ADD COLUMN IF NOT EXISTS "client_confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "agenda_appointments" ADD COLUMN IF NOT EXISTS "client_confirmed_via" varchar(30);
