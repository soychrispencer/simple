CREATE TABLE IF NOT EXISTS "serenata_group_invites" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "group_id" uuid NOT NULL REFERENCES "serenata_groups"("id") ON DELETE CASCADE,
    "invited_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "display_name" varchar(160),
    "email" varchar(255),
    "phone" varchar(40),
    "token" varchar(64) NOT NULL,
    "status" varchar(30) DEFAULT 'pending' NOT NULL,
    "musician_id" uuid REFERENCES "serenata_musicians"("id") ON DELETE SET NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "serenata_group_invites_token_idx" ON "serenata_group_invites" ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_group_invites_group_idx" ON "serenata_group_invites" ("group_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_group_invites_status_idx" ON "serenata_group_invites" ("status");
