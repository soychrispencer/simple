ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_digest_frequency" varchar(10) NOT NULL DEFAULT 'off';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_notification_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "channel" varchar(20) NOT NULL,
  "event_type" varchar(60) NOT NULL,
  "summary" varchar(255) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_notification_log_user_created_idx" ON "user_notification_log" ("user_id", "created_at" DESC);
