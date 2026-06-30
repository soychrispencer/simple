ALTER TABLE address_book
ADD COLUMN IF NOT EXISTS scope varchar(20) NOT NULL DEFAULT 'personal';
--> statement-breakpoint
UPDATE address_book
SET scope = CASE
    WHEN kind IN ('personal', 'shipping', 'billing') THEN 'personal'
    ELSE 'business'
END
WHERE scope = 'personal' OR scope IS NULL;
