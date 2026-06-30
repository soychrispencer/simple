CREATE TABLE IF NOT EXISTS "serenata_provider_group_blocked_slots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_group_id" uuid NOT NULL REFERENCES "serenata_provider_groups"("id") ON DELETE CASCADE,
  "starts_at" timestamp NOT NULL,
  "ends_at" timestamp NOT NULL,
  "reason" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "serenata_provider_group_blocked_slots_provider_idx"
  ON "serenata_provider_group_blocked_slots" ("provider_group_id");
