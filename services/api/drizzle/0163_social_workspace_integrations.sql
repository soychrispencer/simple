UPDATE tiktok_accounts AS integration
SET account_id = membership.account_id
FROM account_users AS membership
WHERE integration.account_id IS NULL
  AND membership.user_id = integration.user_id
  AND membership.is_default = true;
--> statement-breakpoint
UPDATE youtube_accounts AS integration
SET account_id = membership.account_id
FROM account_users AS membership
WHERE integration.account_id IS NULL
  AND membership.user_id = integration.user_id
  AND membership.is_default = true;
--> statement-breakpoint
DROP INDEX IF EXISTS tiktok_accounts_user_vertical_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS youtube_accounts_user_vertical_idx;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tiktok_accounts_account_vertical_idx
  ON tiktok_accounts (account_id, vertical);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS youtube_accounts_account_vertical_idx
  ON youtube_accounts (account_id, vertical);
