ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "in_app_notifications_enabled" boolean NOT NULL DEFAULT true;
