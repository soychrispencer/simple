ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_notification_email_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_notification_whatsapp_at" timestamp;
