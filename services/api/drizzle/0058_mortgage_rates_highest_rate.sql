ALTER TABLE "mortgage_rates" ADD COLUMN IF NOT EXISTS "highest_rate" decimal(5,2) NOT NULL DEFAULT '5.50';
--> statement-breakpoint
UPDATE "mortgage_rates" SET "highest_rate" = "standard_rate";
