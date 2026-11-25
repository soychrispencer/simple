ALTER TABLE "agenda_appointments"
  ADD COLUMN IF NOT EXISTS "whatsapp_reminder_opt_in" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "agenda_appointments"
  ADD COLUMN IF NOT EXISTS "whatsapp_reminder_opt_in_at" timestamp;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_whatsapp_opt_outs" (
  "phone_number" varchar(15) PRIMARY KEY,
  "opted_out_at" timestamp NOT NULL DEFAULT now(),
  "source_message_id" varchar(255)
);
