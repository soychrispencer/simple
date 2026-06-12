-- Add timezone column to serenata_provider_groups
ALTER TABLE "serenata_provider_groups" ADD COLUMN "timezone" varchar(50) NOT NULL DEFAULT 'America/Santiago';
