ALTER TABLE public_profiles
    ADD COLUMN IF NOT EXISTS mp_access_token text,
    ADD COLUMN IF NOT EXISTS mp_public_key varchar(255),
    ADD COLUMN IF NOT EXISTS mp_user_id varchar(100),
    ADD COLUMN IF NOT EXISTS mp_refresh_token text;

ALTER TABLE serenata_provider_groups
    ADD COLUMN IF NOT EXISTS mp_access_token text,
    ADD COLUMN IF NOT EXISTS mp_public_key varchar(255),
    ADD COLUMN IF NOT EXISTS mp_user_id varchar(100),
    ADD COLUMN IF NOT EXISTS mp_refresh_token text;
