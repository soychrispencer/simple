CREATE TABLE IF NOT EXISTS "serenata_musician_payouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "serenata_id" uuid NOT NULL REFERENCES "serenatas"("id") ON DELETE CASCADE,
  "owner_id" uuid NOT NULL REFERENCES "serenata_owners"("id") ON DELETE CASCADE,
  "musician_id" uuid REFERENCES "serenata_musicians"("id") ON DELETE SET NULL,
  "musician_name" varchar(160),
  "amount" integer NOT NULL,
  "status" varchar(24) DEFAULT 'pending' NOT NULL,
  "payment_method" varchar(24),
  "paid_at" timestamp,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "serenata_musician_payouts_owner_idx" ON "serenata_musician_payouts" ("owner_id");
CREATE INDEX IF NOT EXISTS "serenata_musician_payouts_serenata_idx" ON "serenata_musician_payouts" ("serenata_id");
CREATE INDEX IF NOT EXISTS "serenata_musician_payouts_status_idx" ON "serenata_musician_payouts" ("owner_id", "status");
