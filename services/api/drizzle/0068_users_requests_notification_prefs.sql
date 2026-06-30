ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_notify_requests" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp_notify_requests" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE "users"
SET "whatsapp_notify_requests" = "whatsapp_notify_agenda"
WHERE "whatsapp_notify_agenda" = true;
