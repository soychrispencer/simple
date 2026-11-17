ALTER TABLE "agenda_account_visits"
  ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_account_visits_reminder_due_idx"
  ON "agenda_account_visits" ("starts_at", "reminder_sent_at");
