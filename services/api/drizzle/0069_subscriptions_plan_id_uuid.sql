-- Legacy DBs stored subscriptions.plan_id as varchar (plan slug). Drizzle/schema expect uuid FK.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'subscriptions'
      AND c.column_name = 'plan_id'
      AND c.data_type = 'character varying'
  ) THEN
    RETURN;
  END IF;

  ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_subscription_plans_id_fk;

  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id_uuid uuid;

  UPDATE subscriptions s
  SET plan_id_uuid = sp.id
  FROM subscription_plans sp
  WHERE s.plan_id_uuid IS NULL
    AND sp.vertical = s.vertical
    AND sp.plan_id = s.plan_id;

  UPDATE subscriptions s
  SET plan_id_uuid = s.plan_id::uuid
  WHERE s.plan_id_uuid IS NULL
    AND s.plan_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  UPDATE subscriptions s
  SET plan_id_uuid = sp.id
  FROM subscription_plans sp
  WHERE s.plan_id_uuid IS NULL
    AND sp.vertical = s.vertical
    AND sp.plan_id IN ('pro', 'enterprise')
    AND lower(s.plan_id) IN ('pro', 'enterprise');

  UPDATE subscriptions s
  SET plan_id_uuid = sp.id
  FROM subscription_plans sp
  WHERE s.plan_id_uuid IS NULL
    AND sp.vertical = s.vertical
    AND sp.is_default = true;

  DELETE FROM subscriptions WHERE plan_id_uuid IS NULL;

  ALTER TABLE subscriptions DROP COLUMN plan_id;
  ALTER TABLE subscriptions RENAME COLUMN plan_id_uuid TO plan_id;
  ALTER TABLE subscriptions ALTER COLUMN plan_id SET NOT NULL;

  ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_plan_id_subscription_plans_id_fk
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;
END $$;
