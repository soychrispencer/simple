ALTER TABLE listing_drafts
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE CASCADE;
--> statement-breakpoint
UPDATE listing_drafts AS draft
SET account_id = (
  SELECT personal_account.id
  FROM accounts AS personal_account
  WHERE personal_account.owner_user_id = draft.user_id
    AND personal_account.is_personal = true
  ORDER BY personal_account.created_at ASC, personal_account.id ASC
  LIMIT 1
)
WHERE draft.account_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM accounts AS personal_account
    WHERE personal_account.owner_user_id = draft.user_id
      AND personal_account.is_personal = true
  );
--> statement-breakpoint
UPDATE listing_drafts AS draft
SET account_id = (
  SELECT membership.account_id
  FROM account_users AS membership
  WHERE membership.user_id = draft.user_id
  ORDER BY membership.is_default DESC, membership.created_at ASC
  LIMIT 1
)
WHERE draft.account_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM account_users AS membership
    WHERE membership.user_id = draft.user_id
  );
--> statement-breakpoint
DROP INDEX IF EXISTS listing_drafts_user_vertical_idx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS listing_drafts_account_user_vertical_idx
  ON listing_drafts (user_id, account_id, vertical)
  WHERE account_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS listing_drafts_user_vertical_legacy_idx
  ON listing_drafts (user_id, vertical)
  WHERE account_id IS NULL;
