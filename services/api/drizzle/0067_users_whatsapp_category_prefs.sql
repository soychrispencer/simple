ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp_notify_invitations" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp_notify_agenda" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp_notify_account" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE "users"
SET
  "whatsapp_notify_invitations" = "whatsapp_enabled",
  "whatsapp_notify_agenda" = "whatsapp_enabled"
WHERE "whatsapp_enabled" = true;
