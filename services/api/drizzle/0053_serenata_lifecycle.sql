ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "completed_by" uuid;
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "cancel_reason" text;
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp;
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "cancelled_by" uuid;
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "client_confirmed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "closure_reminder_sent_at" timestamp;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'serenatas_completed_by_users_id_fk'
  ) THEN
    ALTER TABLE "serenatas"
      ADD CONSTRAINT "serenatas_completed_by_users_id_fk"
      FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'serenatas_cancelled_by_users_id_fk'
  ) THEN
    ALTER TABLE "serenatas"
      ADD CONSTRAINT "serenatas_cancelled_by_users_id_fk"
      FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;
