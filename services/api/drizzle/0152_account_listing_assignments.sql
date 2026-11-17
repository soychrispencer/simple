CREATE TABLE IF NOT EXISTS "account_listing_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "vertical" varchar(20) NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "assigned_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "assigned_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_listing_assignments_listing_member_idx"
  ON "account_listing_assignments" ("account_id", "listing_id", "assigned_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_listing_assignments_member_idx"
  ON "account_listing_assignments" ("account_id", "assigned_user_id", "vertical");
