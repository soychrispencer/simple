WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY account_id, vertical
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS keep_id
  FROM instagram_accounts
  WHERE account_id IS NOT NULL
)
UPDATE instagram_publications AS publication
SET instagram_account_id = ranked.keep_id
FROM ranked
WHERE publication.instagram_account_id = ranked.id
  AND ranked.id <> ranked.keep_id;
--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY account_id, vertical
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_rank
  FROM instagram_accounts
  WHERE account_id IS NOT NULL
)
DELETE FROM instagram_accounts AS integration
USING ranked
WHERE integration.id = ranked.id
  AND ranked.row_rank > 1;
--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY account_id, vertical
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_rank
  FROM tiktok_accounts
  WHERE account_id IS NOT NULL
)
DELETE FROM tiktok_accounts AS integration
USING ranked
WHERE integration.id = ranked.id
  AND ranked.row_rank > 1;
--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY account_id, vertical
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_rank
  FROM youtube_accounts
  WHERE account_id IS NOT NULL
)
DELETE FROM youtube_accounts AS integration
USING ranked
WHERE integration.id = ranked.id
  AND ranked.row_rank > 1;
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
