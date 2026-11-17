CREATE TABLE IF NOT EXISTS "account_relationship_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "vertical" varchar(20) NOT NULL,
  "person_id" varchar(160) NOT NULL,
  "title" varchar(180) NOT NULL,
  "assigned_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "due_at" timestamp,
  "status" varchar(20) NOT NULL DEFAULT 'open',
  "completed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_relationship_tasks_contact_due_idx"
  ON "account_relationship_tasks" ("account_id", "vertical", "person_id", "due_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_relationship_tasks_assignee_status_idx"
  ON "account_relationship_tasks" ("account_id", "assigned_user_id", "status", "due_at");
