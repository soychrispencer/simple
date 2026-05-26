CREATE TABLE IF NOT EXISTS "serenata_saved_provider_groups" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "provider_group_id" uuid NOT NULL REFERENCES "serenata_provider_groups"("id") ON DELETE CASCADE,
    "saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "serenata_saved_provider_groups_user_group_idx"
    ON "serenata_saved_provider_groups" ("user_id", "provider_group_id");
