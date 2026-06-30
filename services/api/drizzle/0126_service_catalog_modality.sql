-- Modalidad online / presencial en catálogos marketplace y serenatas.

ALTER TABLE marketplace_operator_services
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_presential boolean NOT NULL DEFAULT true;

ALTER TABLE serenata_group_services
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_presential boolean NOT NULL DEFAULT true;
