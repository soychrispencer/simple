ALTER TABLE public_profiles
    ADD COLUMN IF NOT EXISTS booking_terms_text text;

ALTER TABLE serenata_provider_groups
    ADD COLUMN IF NOT EXISTS booking_terms_text text;
