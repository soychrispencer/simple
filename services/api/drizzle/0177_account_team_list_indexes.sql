CREATE INDEX IF NOT EXISTS account_users_account_created_user_idx
  ON account_users (account_id, created_at, user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS account_invitations_account_pending_created_idx
  ON account_invitations (account_id, created_at, id)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
