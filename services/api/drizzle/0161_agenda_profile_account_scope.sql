UPDATE agenda_professional_profiles AS profile
SET account_id = COALESCE(
  (
    SELECT personal_account.id
    FROM accounts AS personal_account
    WHERE personal_account.owner_user_id = profile.user_id
      AND personal_account.is_personal = true
    ORDER BY personal_account.created_at ASC, personal_account.id ASC
    LIMIT 1
  ),
  (
    SELECT membership.account_id
    FROM account_users AS membership
    WHERE membership.user_id = profile.user_id
    ORDER BY membership.is_default DESC, membership.created_at ASC
    LIMIT 1
  )
)
WHERE profile.account_id IS NULL
  AND (
    EXISTS (
      SELECT 1
      FROM accounts AS personal_account
      WHERE personal_account.owner_user_id = profile.user_id
        AND personal_account.is_personal = true
    )
    OR EXISTS (
      SELECT 1
      FROM account_users AS membership
      WHERE membership.user_id = profile.user_id
    )
  );
--> statement-breakpoint
DROP INDEX IF EXISTS agenda_profiles_user_id_idx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS agenda_profiles_account_user_idx
  ON agenda_professional_profiles (account_id, user_id)
  WHERE account_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS agenda_profiles_legacy_user_idx
  ON agenda_professional_profiles (user_id)
  WHERE account_id IS NULL;
