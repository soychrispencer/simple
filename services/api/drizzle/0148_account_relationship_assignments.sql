CREATE TABLE "account_relationship_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "vertical" varchar(20) NOT NULL,
  "person_id" varchar(160) NOT NULL,
  "assigned_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "assigned_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "account_relationship_assignments_account_person_idx"
  ON "account_relationship_assignments" ("account_id", "vertical", "person_id");
--> statement-breakpoint
CREATE INDEX "account_relationship_assignments_assignee_idx"
  ON "account_relationship_assignments" ("account_id", "assigned_user_id");
