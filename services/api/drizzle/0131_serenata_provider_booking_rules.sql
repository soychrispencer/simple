ALTER TABLE serenata_provider_groups
    ADD COLUMN IF NOT EXISTS booking_window_days integer NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS cancellation_hours integer NOT NULL DEFAULT 24;
