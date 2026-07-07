ALTER TABLE "boost_orders" ADD COLUMN IF NOT EXISTS "target_type" varchar(32) DEFAULT 'listing' NOT NULL;
--> statement-breakpoint
ALTER TABLE "boost_orders" ADD COLUMN IF NOT EXISTS "target_id" uuid;
--> statement-breakpoint
UPDATE "boost_orders"
SET
  "target_type" = 'listing',
  "target_id" = "listing_id"
WHERE "target_id" IS NULL AND "listing_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "boost_orders" DROP CONSTRAINT IF EXISTS "boost_orders_listing_id_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "boost_orders" ALTER COLUMN "listing_id" DROP NOT NULL;
