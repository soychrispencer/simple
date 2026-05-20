ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_calendar_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_calendar_access_token" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_calendar_refresh_token" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_calendar_token_expiry" timestamp;
