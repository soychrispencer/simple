ALTER TABLE serenata_payments ADD COLUMN IF NOT EXISTS commission_vat integer NOT NULL DEFAULT 0;
