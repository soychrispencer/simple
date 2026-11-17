UPDATE instagram_accounts AS integration
SET account_id = membership.account_id
FROM account_users AS membership
WHERE integration.account_id IS NULL
  AND membership.user_id = integration.user_id
  AND membership.is_default = true;
--> statement-breakpoint
DROP INDEX IF EXISTS instagram_accounts_user_vertical_idx;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS instagram_accounts_account_vertical_idx
  ON instagram_accounts (account_id, vertical);
