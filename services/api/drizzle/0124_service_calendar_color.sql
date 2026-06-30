ALTER TABLE "marketplace_operator_services" ADD COLUMN IF NOT EXISTS "color" varchar(20);

ALTER TABLE "serenata_group_services" ADD COLUMN IF NOT EXISTS "color" varchar(20);
