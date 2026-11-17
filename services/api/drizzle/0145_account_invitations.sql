CREATE TABLE IF NOT EXISTS account_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'agent',
  token_hash varchar(64) NOT NULL,
  invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamp NOT NULL,
  accepted_at timestamp,
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS account_invitations_token_hash_idx
  ON account_invitations (token_hash);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS account_invitations_account_idx
  ON account_invitations (account_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS account_invitations_email_idx
  ON account_invitations (email);
