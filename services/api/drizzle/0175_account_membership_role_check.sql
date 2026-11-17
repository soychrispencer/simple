DO $$
DECLARE
  existing_constraint_definition text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM account_users
    WHERE role NOT IN ('owner', 'admin', 'agent')
  ) THEN
    RAISE EXCEPTION 'Cannot enforce account membership roles: run db:audit:account-memberships and reconcile invalid roles first.';
  END IF;

  SELECT pg_get_constraintdef(constraint_record.oid)
  INTO existing_constraint_definition
  FROM pg_constraint AS constraint_record
  WHERE constraint_record.conrelid = 'account_users'::regclass
    AND constraint_record.conname = 'account_users_role_allowed_check'
    AND constraint_record.contype = 'c';

  IF existing_constraint_definition IS NOT NULL
     AND existing_constraint_definition !~* 'role.*owner.*admin.*agent' THEN
    RAISE EXCEPTION 'Constraint account_users_role_allowed_check already exists with a different definition.';
  END IF;

  IF existing_constraint_definition IS NULL THEN
    EXECUTE 'ALTER TABLE account_users
      ADD CONSTRAINT account_users_role_allowed_check
      CHECK (role IN (''owner'', ''admin'', ''agent'')) NOT VALID';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_record
    WHERE constraint_record.conrelid = 'account_users'::regclass
      AND constraint_record.conname = 'account_users_role_allowed_check'
      AND NOT constraint_record.convalidated
  ) THEN
    EXECUTE 'ALTER TABLE account_users VALIDATE CONSTRAINT account_users_role_allowed_check';
  END IF;
END $$;
