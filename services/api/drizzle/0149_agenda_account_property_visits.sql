CREATE TABLE "agenda_account_visits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "listing_id" uuid REFERENCES "listings"("id") ON DELETE SET NULL,
  "contact_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "contact_name" varchar(160) NOT NULL,
  "contact_phone" varchar(30),
  "assigned_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "starts_at" timestamp NOT NULL,
  "duration_minutes" integer NOT NULL DEFAULT 30,
  "status" varchar(20) NOT NULL DEFAULT 'scheduled',
  "location" varchar(255),
  "internal_notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "agenda_account_visits_account_starts_idx"
  ON "agenda_account_visits" ("account_id", "starts_at");
--> statement-breakpoint
CREATE INDEX "agenda_account_visits_assignee_starts_idx"
  ON "agenda_account_visits" ("assigned_user_id", "starts_at");
