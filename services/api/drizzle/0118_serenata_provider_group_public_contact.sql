ALTER TABLE serenata_provider_groups
ADD COLUMN IF NOT EXISTS public_email varchar(255);
--> statement-breakpoint
ALTER TABLE serenata_provider_groups
ADD COLUMN IF NOT EXISTS website_url varchar(500);
--> statement-breakpoint
ALTER TABLE serenata_provider_groups
ADD COLUMN IF NOT EXISTS instagram_url varchar(500);
--> statement-breakpoint
ALTER TABLE serenata_provider_groups
ADD COLUMN IF NOT EXISTS facebook_url varchar(500);
--> statement-breakpoint
ALTER TABLE serenata_provider_groups
ADD COLUMN IF NOT EXISTS linkedin_url varchar(500);
--> statement-breakpoint
ALTER TABLE serenata_provider_groups
ADD COLUMN IF NOT EXISTS tiktok_url varchar(500);
--> statement-breakpoint
ALTER TABLE serenata_provider_groups
ADD COLUMN IF NOT EXISTS youtube_url varchar(500);
--> statement-breakpoint
ALTER TABLE serenata_provider_groups
ADD COLUMN IF NOT EXISTS twitter_url varchar(500);
