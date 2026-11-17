LOCK TABLE users, accounts, account_users IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS accounts_single_personal_owner_idx
  ON accounts (owner_user_id)
  WHERE is_personal = true;
--> statement-breakpoint
INSERT INTO accounts (name, type, owner_user_id, is_personal)
SELECT
  COALESCE(NULLIF(trim(person.name), ''), NULLIF(split_part(person.email, '@', 1), ''), 'Cuenta personal'),
  'general',
  person.id,
  true
FROM users AS person
WHERE NOT EXISTS (
  SELECT 1
  FROM accounts AS personal_account
  WHERE personal_account.owner_user_id = person.id
    AND personal_account.is_personal = true
)
ON CONFLICT (owner_user_id) WHERE is_personal = true DO NOTHING;
--> statement-breakpoint
INSERT INTO account_users (account_id, user_id, role, is_default)
SELECT
  personal_account.id,
  personal_account.owner_user_id,
  'owner',
  NOT EXISTS (
    SELECT 1
    FROM account_users AS current_default
    WHERE current_default.user_id = personal_account.owner_user_id
      AND current_default.is_default = true
  )
FROM accounts AS personal_account
WHERE personal_account.is_personal = true
  AND NOT EXISTS (
    SELECT 1
    FROM account_users AS personal_owner_membership
    WHERE personal_owner_membership.account_id = personal_account.id
      AND personal_owner_membership.user_id = personal_account.owner_user_id
  )
ON CONFLICT (account_id, user_id) DO NOTHING;
--> statement-breakpoint
UPDATE account_users AS personal_owner_membership
SET is_default = true,
    updated_at = now()
FROM accounts AS personal_account
WHERE personal_account.is_personal = true
  AND personal_owner_membership.account_id = personal_account.id
  AND personal_owner_membership.user_id = personal_account.owner_user_id
  AND personal_owner_membership.role = 'owner'
  AND NOT EXISTS (
    SELECT 1
    FROM account_users AS current_default
    WHERE current_default.user_id = personal_account.owner_user_id
      AND current_default.is_default = true
  );
