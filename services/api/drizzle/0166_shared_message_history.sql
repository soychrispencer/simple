ALTER TABLE "message_entries" ALTER COLUMN "sender_user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "message_entries" DROP CONSTRAINT IF EXISTS "message_entries_sender_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "message_entries"
  ADD CONSTRAINT "message_entries_sender_user_id_users_id_fk"
  FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
