DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM accounts AS account
    LEFT JOIN account_users AS membership ON membership.account_id = account.id
    GROUP BY account.id, account.owner_user_id
    HAVING count(membership.id) FILTER (WHERE membership.role = 'owner') <> 1
       OR count(membership.id) FILTER (
            WHERE membership.role = 'owner'
              AND membership.user_id = account.owner_user_id
          ) <> 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one owner per account: run db:audit:account-memberships and reconcile owner mismatches first.';
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS account_users_single_owner_idx
  ON account_users (account_id)
  WHERE role = 'owner';
