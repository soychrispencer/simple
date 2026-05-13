ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "payment_status" varchar(30) DEFAULT 'not_required' NOT NULL;
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "payment_order_id" varchar(120);
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "paid_at" timestamp;
--> statement-breakpoint
UPDATE "serenatas"
SET "payment_status" = CASE
    WHEN "source" = 'platform_lead' THEN 'paid'
    ELSE 'not_required'
END
WHERE "payment_status" = 'not_required';
