ALTER TABLE "serenatas"
ADD COLUMN IF NOT EXISTS "owner_payout_status" varchar(24);

ALTER TABLE "serenatas"
ADD COLUMN IF NOT EXISTS "owner_payout_at" timestamp;

ALTER TABLE "serenatas"
ADD COLUMN IF NOT EXISTS "owner_payout_reference" text;

ALTER TABLE "serenatas"
ADD COLUMN IF NOT EXISTS "owner_payout_amount" integer;

