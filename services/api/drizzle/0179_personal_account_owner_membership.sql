LOCK TABLE accounts, account_users IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
UPDATE account_users AS personal_owner_membership
SET role = 'owner',
    updated_at = now()
FROM accounts AS personal_account
WHERE personal_account.is_personal = true
  AND personal_owner_membership.account_id = personal_account.id
  AND personal_owner_membership.user_id = personal_account.owner_user_id
  AND personal_owner_membership.role <> 'owner'
  AND NOT EXISTS (
    SELECT 1
    FROM account_users AS different_owner
    WHERE different_owner.account_id = personal_account.id
      AND different_owner.role = 'owner'
      AND different_owner.user_id <> personal_account.owner_user_id
  );
