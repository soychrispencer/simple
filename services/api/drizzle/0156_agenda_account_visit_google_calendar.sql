ALTER TABLE "agenda_account_visits"
  ADD COLUMN IF NOT EXISTS "google_event_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "agenda_account_visits"
  ADD COLUMN IF NOT EXISTS "google_calendar_owner_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
