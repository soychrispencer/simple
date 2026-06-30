ALTER TABLE "serenata_group_services"
  ADD COLUMN IF NOT EXISTS "songs_included" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "repertoire_policy" varchar(24) NOT NULL DEFAULT 'any_active';

ALTER TABLE "serenatas"
  ADD COLUMN IF NOT EXISTS "setlist_status" varchar(24) NOT NULL DEFAULT 'pending_owner',
  ADD COLUMN IF NOT EXISTS "songs_included_at_booking" integer,
  ADD COLUMN IF NOT EXISTS "setlist_confirmed_at" timestamp;

CREATE TABLE IF NOT EXISTS "serenata_repertoire_songs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_group_id" uuid NOT NULL REFERENCES "serenata_provider_groups"("id") ON DELETE cascade,
  "title" varchar(200) NOT NULL,
  "artist" varchar(160),
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "serenata_repertoire_songs_provider_idx"
  ON "serenata_repertoire_songs" ("provider_group_id");

CREATE INDEX IF NOT EXISTS "serenata_repertoire_songs_active_idx"
  ON "serenata_repertoire_songs" ("provider_group_id", "is_active");

CREATE TABLE IF NOT EXISTS "serenata_service_songs" (
  "service_id" uuid NOT NULL REFERENCES "serenata_group_services"("id") ON DELETE cascade,
  "repertoire_song_id" uuid NOT NULL REFERENCES "serenata_repertoire_songs"("id") ON DELETE cascade,
  PRIMARY KEY ("service_id", "repertoire_song_id")
);

CREATE TABLE IF NOT EXISTS "serenata_song_selections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "serenata_id" uuid NOT NULL REFERENCES "serenatas"("id") ON DELETE cascade,
  "repertoire_song_id" uuid REFERENCES "serenata_repertoire_songs"("id") ON DELETE set null,
  "kind" varchar(32) NOT NULL,
  "title" varchar(200) NOT NULL,
  "artist" varchar(160),
  "sort_order" integer DEFAULT 0 NOT NULL,
  "client_note" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "serenata_song_selections_serenata_idx"
  ON "serenata_song_selections" ("serenata_id");

CREATE TABLE IF NOT EXISTS "serenata_song_scores" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "repertoire_song_id" uuid NOT NULL REFERENCES "serenata_repertoire_songs"("id") ON DELETE cascade,
  "instrument" varchar(80) NOT NULL,
  "format" varchar(16) NOT NULL DEFAULT 'pdf',
  "storage_url" text NOT NULL,
  "original_filename" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "serenata_song_scores_song_instrument_idx"
  ON "serenata_song_scores" ("repertoire_song_id", "instrument");
