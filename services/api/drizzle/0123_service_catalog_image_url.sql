ALTER TABLE "agenda_services" ADD COLUMN IF NOT EXISTS "image_url" varchar(500);

ALTER TABLE "serenata_group_services" ADD COLUMN IF NOT EXISTS "image_url" varchar(500);
