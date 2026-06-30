ALTER TABLE serenata_provider_groups
    ALTER COLUMN accepts_cash SET DEFAULT false;

UPDATE serenata_provider_groups
SET accepts_cash = false
WHERE accepts_cash = true
  AND accepts_transfer = false
  AND accepts_mp = false
  AND accepts_payment_link = false;
