-- SimpleSerenatas plans and their subscription charges belong to each provider.
-- Keep bookings and other Serenatas payment orders in their existing scopes.
WITH ranked_personal_accounts AS (
  SELECT id,
         owner_user_id,
         ROW_NUMBER() OVER (PARTITION BY owner_user_id ORDER BY created_at, id) AS account_rank
  FROM accounts
  WHERE is_personal = TRUE
    AND owner_user_id IS NOT NULL
)
UPDATE subscriptions AS s
SET account_id = a.id
FROM ranked_personal_accounts AS a
WHERE s.vertical = 'serenatas'
  AND a.owner_user_id = s.user_id
  AND a.account_rank = 1
  AND s.account_id IS DISTINCT FROM a.id;
--> statement-breakpoint
WITH ranked_personal_accounts AS (
  SELECT id,
         owner_user_id,
         ROW_NUMBER() OVER (PARTITION BY owner_user_id ORDER BY created_at, id) AS account_rank
  FROM accounts
  WHERE is_personal = TRUE
    AND owner_user_id IS NOT NULL
)
UPDATE payment_orders AS po
SET account_id = a.id
FROM ranked_personal_accounts AS a
WHERE po.vertical = 'serenatas'
  AND po.kind = 'subscription'
  AND a.owner_user_id = po.user_id
  AND a.account_rank = 1
  AND po.account_id IS DISTINCT FROM a.id;
