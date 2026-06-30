ALTER TABLE serenata_provider_groups
ADD COLUMN IF NOT EXISTS account_kind varchar(20) NOT NULL DEFAULT 'individual';

ALTER TABLE serenata_provider_groups
ADD COLUMN IF NOT EXISTS operator_subtype varchar(40);

ALTER TABLE serenata_provider_groups
ADD COLUMN IF NOT EXISTS operator_subtype_custom varchar(160);
