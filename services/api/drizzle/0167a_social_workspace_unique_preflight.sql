-- Do not silently discard an existing social connection during the next
-- migration. Stop before 0168 unless every workspace has at most one per app.
LOCK TABLE instagram_accounts, tiktok_accounts, youtube_accounts
  IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM instagram_accounts
    WHERE account_id IS NOT NULL
    GROUP BY account_id, vertical
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate Instagram workspace connections found. Run db:audit:social-workspace-integrations and reconcile them before migration.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM tiktok_accounts
    WHERE account_id IS NOT NULL
    GROUP BY account_id, vertical
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate TikTok workspace connections found. Run db:audit:social-workspace-integrations and reconcile them before migration.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM youtube_accounts
    WHERE account_id IS NOT NULL
    GROUP BY account_id, vertical
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate YouTube workspace connections found. Run db:audit:social-workspace-integrations and reconcile them before migration.';
  END IF;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS instagram_accounts_account_vertical_idx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS instagram_accounts_account_vertical_idx
  ON instagram_accounts (account_id, vertical)
  WHERE account_id IS NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS tiktok_accounts_account_vertical_idx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS tiktok_accounts_account_vertical_idx
  ON tiktok_accounts (account_id, vertical)
  WHERE account_id IS NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS youtube_accounts_account_vertical_idx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS youtube_accounts_account_vertical_idx
  ON youtube_accounts (account_id, vertical)
  WHERE account_id IS NOT NULL;
