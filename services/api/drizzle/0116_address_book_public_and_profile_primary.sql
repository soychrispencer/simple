ALTER TABLE address_book
ADD COLUMN IF NOT EXISTS is_public_visible boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE address_book
SET is_public_visible = true
WHERE scope = 'business'
    AND is_default = true
    AND is_public_visible = false;
--> statement-breakpoint
ALTER TABLE public_profiles
ADD COLUMN IF NOT EXISTS primary_address_id uuid REFERENCES address_book(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS billing_address_id uuid REFERENCES address_book(id) ON DELETE SET NULL;
