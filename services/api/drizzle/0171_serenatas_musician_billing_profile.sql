ALTER TABLE serenata_musicians
    ADD COLUMN IF NOT EXISTS commission_rate_bps integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS commission_vat_rate_bps integer NOT NULL DEFAULT 1900,
    ADD COLUMN IF NOT EXISTS trial_ends_at timestamp;
--> statement-breakpoint

UPDATE serenata_musicians
SET trial_ends_at = COALESCE(created_at, now()) + interval '30 days'
WHERE trial_ends_at IS NULL;
--> statement-breakpoint

ALTER TABLE serenata_musicians
    ALTER COLUMN trial_ends_at SET DEFAULT now() + interval '30 days',
    ALTER COLUMN trial_ends_at SET NOT NULL;
