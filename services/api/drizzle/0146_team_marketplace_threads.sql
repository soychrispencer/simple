UPDATE accounts AS account
SET is_personal = false, updated_at = now()
FROM account_vertical_settings AS workspace
WHERE workspace.account_id = account.id
  AND workspace.vertical = 'propiedades'
  AND workspace.account_kind = 'company'
  AND account.is_personal = true;
--> statement-breakpoint
UPDATE message_threads AS thread
SET account_id = listing.account_id
FROM listings AS listing
WHERE thread.account_id IS NULL
  AND thread.listing_id = listing.id
  AND listing.account_id IS NOT NULL;
