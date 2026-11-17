UPDATE subscriptions AS subscription
SET account_id = (
  SELECT membership.account_id
  FROM account_users AS membership
  WHERE membership.user_id = subscription.user_id
  ORDER BY membership.is_default DESC, membership.created_at ASC
  LIMIT 1
)
WHERE subscription.account_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM account_users AS membership
    WHERE membership.user_id = subscription.user_id
  );
--> statement-breakpoint
DROP INDEX IF EXISTS subscriptions_user_vertical_idx;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS subscriptions_user_vertical_idx
  ON subscriptions (user_id, vertical);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS subscriptions_account_vertical_idx
  ON subscriptions (account_id, vertical);
