ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp_enabled" boolean NOT NULL DEFAULT false;
