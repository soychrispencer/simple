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

ALTER TABLE "platform_notifications" ADD COLUMN IF NOT EXISTS "metadata" jsonb;

DO $$
DECLARE
  legacy_oid oid;
  legacy_schema name;
  legacy_table name;
  legacy_kind "char";
  metadata_expression text := 'NULL::jsonb';
BEGIN
  legacy_oid := to_regclass('serenata_notifications');

  IF legacy_oid IS NOT NULL THEN
    SELECT n.nspname, c.relname, c.relkind
      INTO legacy_schema, legacy_table, legacy_kind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.oid = legacy_oid;

    IF legacy_kind IN ('r', 'p') THEN
      IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = legacy_schema
           AND table_name = legacy_table
           AND column_name = 'metadata'
      ) THEN
        metadata_expression := '"metadata"';
      END IF;

      EXECUTE format(
        'INSERT INTO "platform_notifications" ("id", "user_id", "vertical", "type", "title", "body", "action_url", "metadata", "is_read", "created_at")
         SELECT "id", "user_id", ''serenatas'', "type", "title", "message", NULL, %s, "is_read", "created_at"
           FROM %s
         ON CONFLICT ("id") DO NOTHING',
        metadata_expression,
        legacy_oid::regclass
      );

      EXECUTE format('DROP TABLE %s', legacy_oid::regclass);
    END IF;
  END IF;
END $$;

ALTER TABLE "users" DROP COLUMN IF EXISTS "whatsapp_enabled";
ALTER TABLE "users" DROP COLUMN IF EXISTS "whatsapp_notify_invitations";
ALTER TABLE "users" DROP COLUMN IF EXISTS "whatsapp_notify_requests";
ALTER TABLE "users" DROP COLUMN IF EXISTS "whatsapp_notify_agenda";
ALTER TABLE "users" DROP COLUMN IF EXISTS "whatsapp_notify_account";
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_notification_whatsapp_at";

ALTER TABLE "agenda_professional_profiles" DROP COLUMN IF EXISTS "wa_notifications_enabled";
ALTER TABLE "agenda_professional_profiles" DROP COLUMN IF EXISTS "wa_notify_professional";
ALTER TABLE "agenda_professional_profiles" DROP COLUMN IF EXISTS "wa_professional_phone";
