-- Centro de notificaciones unificado + retiro WhatsApp API / prefs

CREATE TABLE IF NOT EXISTS "platform_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "vertical" varchar(20),
  "type" varchar(60) NOT NULL,
  "title" varchar(160) NOT NULL,
  "body" text,
  "action_url" varchar(500),
  "entity_type" varchar(40),
  "entity_id" uuid,
  "metadata" jsonb,
  "is_read" boolean DEFAULT false NOT NULL,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "platform_notifications_user_created_idx"
  ON "platform_notifications" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "platform_notifications_user_unread_idx"
  ON "platform_notifications" ("user_id", "is_read");

INSERT INTO "platform_notifications" (
  "id", "user_id", "vertical", "type", "title", "body", "action_url", "metadata", "is_read", "created_at"
)
SELECT
  "id",
  "user_id",
  'serenatas',
  "type",
  "title",
  "message",
  NULL,
  "metadata",
  "is_read",
  "created_at"
FROM "serenata_notifications";

DROP TABLE IF EXISTS "serenata_notifications";

ALTER TABLE "users" DROP COLUMN IF EXISTS "whatsapp_enabled";
ALTER TABLE "users" DROP COLUMN IF EXISTS "whatsapp_notify_invitations";
ALTER TABLE "users" DROP COLUMN IF EXISTS "whatsapp_notify_requests";
ALTER TABLE "users" DROP COLUMN IF EXISTS "whatsapp_notify_agenda";
ALTER TABLE "users" DROP COLUMN IF EXISTS "whatsapp_notify_account";
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_notification_whatsapp_at";

ALTER TABLE "agenda_professional_profiles" DROP COLUMN IF EXISTS "wa_notifications_enabled";
ALTER TABLE "agenda_professional_profiles" DROP COLUMN IF EXISTS "wa_notify_professional";
ALTER TABLE "agenda_professional_profiles" DROP COLUMN IF EXISTS "wa_professional_phone";
