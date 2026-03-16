ALTER TABLE "message_threads" ADD COLUMN "owner_unread_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "message_threads" ADD COLUMN "buyer_unread_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "message_threads" ADD COLUMN "owner_archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "message_threads" ADD COLUMN "buyer_archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "message_threads" ADD COLUMN "owner_spam_at" timestamp;--> statement-breakpoint
ALTER TABLE "message_threads" ADD COLUMN "buyer_spam_at" timestamp;