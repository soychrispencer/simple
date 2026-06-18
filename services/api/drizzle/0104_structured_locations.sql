-- Ubicación estructurada: residencia personal, operación Agenda y cobertura Serenatas.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS residence_country_code varchar(3) NOT NULL DEFAULT 'CL',
    ADD COLUMN IF NOT EXISTS residence_region_id varchar(50),
    ADD COLUMN IF NOT EXISTS residence_region_name varchar(120),
    ADD COLUMN IF NOT EXISTS residence_locality_id varchar(50),
    ADD COLUMN IF NOT EXISTS residence_locality_name varchar(120);

ALTER TABLE agenda_professional_profiles
    ADD COLUMN IF NOT EXISTS country_code varchar(3) NOT NULL DEFAULT 'CL',
    ADD COLUMN IF NOT EXISTS region_id varchar(50),
    ADD COLUMN IF NOT EXISTS locality_id varchar(50),
    ADD COLUMN IF NOT EXISTS service_localities jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS serves_online boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS serves_presential boolean NOT NULL DEFAULT false;

ALTER TABLE serenata_provider_groups
    ADD COLUMN IF NOT EXISTS country_code varchar(3) NOT NULL DEFAULT 'CL',
    ADD COLUMN IF NOT EXISTS region_id varchar(50),
    ADD COLUMN IF NOT EXISTS locality_id varchar(50);

CREATE INDEX IF NOT EXISTS agenda_profiles_marketplace_country_idx
    ON agenda_professional_profiles (country_code, region_id, is_published);

CREATE INDEX IF NOT EXISTS serenata_groups_marketplace_country_idx
    ON serenata_provider_groups (country_code, region, status);
