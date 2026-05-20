ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_notify_invitations" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_notify_agenda" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_notify_account" boolean NOT NULL DEFAULT true;
