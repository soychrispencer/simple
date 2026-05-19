CREATE TABLE IF NOT EXISTS "serenata_provider_group_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_group_id" uuid NOT NULL REFERENCES "serenata_provider_groups"("id") ON DELETE cascade,
  "musician_id" uuid NOT NULL REFERENCES "serenata_musicians"("id") ON DELETE cascade,
  "role" varchar(30) DEFAULT 'musician' NOT NULL,
  "instruments" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" varchar(30) DEFAULT 'invited' NOT NULL,
  "message" text,
  "invited_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "responded_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "serenata_provider_group_members_provider_idx" ON "serenata_provider_group_members" ("provider_group_id");
CREATE INDEX IF NOT EXISTS "serenata_provider_group_members_musician_idx" ON "serenata_provider_group_members" ("musician_id");
CREATE INDEX IF NOT EXISTS "serenata_provider_group_members_status_idx" ON "serenata_provider_group_members" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "serenata_provider_group_members_unique_idx" ON "serenata_provider_group_members" ("provider_group_id","musician_id");

CREATE TABLE IF NOT EXISTS "serenata_provider_group_applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "provider_group_id" uuid REFERENCES "serenata_provider_groups"("id") ON DELETE set null,
  "name" varchar(160) NOT NULL,
  "description" text,
  "phone" varchar(40),
  "whatsapp" varchar(40),
  "region" varchar(120),
  "comuna_base" varchar(120),
  "service_comunas" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" varchar(30) DEFAULT 'pending' NOT NULL,
  "review_notes" text,
  "reviewed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "serenata_provider_group_applications_user_idx" ON "serenata_provider_group_applications" ("user_id");
CREATE INDEX IF NOT EXISTS "serenata_provider_group_applications_status_idx" ON "serenata_provider_group_applications" ("status");
