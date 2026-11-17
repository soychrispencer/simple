ALTER TABLE account_invitations
  ADD COLUMN IF NOT EXISTS vertical varchar(20) NOT NULL DEFAULT 'propiedades';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS account_invitations_account_vertical_idx
  ON account_invitations (account_id, vertical);
