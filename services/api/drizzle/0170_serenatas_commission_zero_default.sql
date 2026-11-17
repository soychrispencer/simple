-- Use the current no-commission policy for newly created provider profiles.
-- Existing provider-specific values are intentionally preserved.
ALTER TABLE serenata_owners
ALTER COLUMN commission_rate_bps SET DEFAULT 0;
