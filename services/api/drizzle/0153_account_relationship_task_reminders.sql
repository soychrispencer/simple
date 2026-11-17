ALTER TABLE "account_relationship_tasks"
  ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_relationship_tasks_due_reminder_idx"
  ON "account_relationship_tasks" ("due_at", "reminder_sent_at")
  WHERE "status" = 'open' AND "due_at" IS NOT NULL;
