-- A SimpleSerenatas login may hold both a provider profile and a musician profile.
-- Give each profile its own plan while keeping workspace billing unique elsewhere.
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS billing_profile_type varchar(20);
--> statement-breakpoint

UPDATE subscriptions AS subscription
SET billing_profile_type = CASE
    WHEN EXISTS (
        SELECT 1 FROM serenata_owners AS owner
        WHERE owner.user_id = subscription.user_id
    ) THEN 'provider'
    WHEN EXISTS (
        SELECT 1 FROM serenata_musicians AS musician
        WHERE musician.user_id = subscription.user_id
    ) THEN 'musician'
    ELSE 'provider'
END
WHERE subscription.vertical = 'serenatas'
  AND subscription.billing_profile_type IS NULL;
--> statement-breakpoint

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM subscriptions
        WHERE vertical = 'serenatas'
          AND billing_profile_type IS NOT NULL
        GROUP BY user_id, billing_profile_type
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot scope SimpleSerenatas billing: duplicate subscriptions exist for a user profile. Review subscriptions grouped by user_id and billing_profile_type before retrying.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM subscriptions
        WHERE vertical <> 'serenatas'
          AND account_id IS NOT NULL
        GROUP BY account_id, vertical
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce workspace billing uniqueness: duplicate subscriptions exist for an account and product.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM subscriptions
        WHERE vertical <> 'serenatas'
          AND account_id IS NULL
        GROUP BY user_id, vertical
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce legacy billing uniqueness: duplicate subscriptions exist for a user and product.';
    END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'subscriptions_billing_profile_type_check'
          AND conrelid = 'subscriptions'::regclass
    ) THEN
        ALTER TABLE subscriptions
            ADD CONSTRAINT subscriptions_billing_profile_type_check
            CHECK (
                (vertical = 'serenatas' AND billing_profile_type IN ('provider', 'musician'))
                OR (vertical <> 'serenatas' AND billing_profile_type IS NULL)
            );
    END IF;
END
$$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_account_vertical_unique_idx
    ON subscriptions (account_id, vertical)
    WHERE account_id IS NOT NULL AND vertical <> 'serenatas';
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_vertical_legacy_unique_idx
    ON subscriptions (user_id, vertical)
    WHERE account_id IS NULL AND vertical <> 'serenatas';
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_serenatas_profile_unique_idx
    ON subscriptions (user_id, billing_profile_type)
    WHERE vertical = 'serenatas' AND billing_profile_type IS NOT NULL;
