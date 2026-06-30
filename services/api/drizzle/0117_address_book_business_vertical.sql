ALTER TABLE address_book
ADD COLUMN IF NOT EXISTS vertical varchar(20);
--> statement-breakpoint
UPDATE address_book AS ab
SET vertical = pp.vertical
FROM public_profiles AS pp
WHERE ab.id = pp.primary_address_id
  AND ab.scope = 'business'
  AND ab.vertical IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS address_book_user_scope_vertical_idx
ON address_book (user_id, scope, vertical);
