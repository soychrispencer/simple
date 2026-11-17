-- Keep one active workspace per person. Preserve the most recently updated
-- current workspace, then backfill users without a default to their personal
-- account when one exists.
WITH ranked_defaults AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC, created_at ASC, id ASC
    ) AS position
  FROM account_users
  WHERE is_default = true
)
UPDATE account_users AS membership
SET is_default = false
FROM ranked_defaults
WHERE membership.id = ranked_defaults.id
  AND ranked_defaults.position > 1;
--> statement-breakpoint

WITH users_without_default AS (
  SELECT DISTINCT membership.user_id
  FROM account_users AS membership
  WHERE NOT EXISTS (
    SELECT 1
    FROM account_users AS current_default
    WHERE current_default.user_id = membership.user_id
      AND current_default.is_default = true
  )
), ranked_memberships AS (
  SELECT
    membership.id,
    row_number() OVER (
      PARTITION BY membership.user_id
      ORDER BY account.is_personal DESC, membership.created_at ASC, membership.id ASC
    ) AS position
  FROM account_users AS membership
  JOIN users_without_default AS missing
    ON missing.user_id = membership.user_id
  JOIN accounts AS account
    ON account.id = membership.account_id
)
UPDATE account_users AS membership
SET is_default = true
FROM ranked_memberships
WHERE membership.id = ranked_memberships.id
  AND ranked_memberships.position = 1;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS account_users_default_user_idx
  ON account_users (user_id)
  WHERE is_default = true;
