CREATE TABLE IF NOT EXISTS "agenda_account_trials" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
    "started_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "started_at" timestamp DEFAULT now() NOT NULL,
    "ends_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agenda_account_trials_account_unique_idx"
    ON "agenda_account_trials" USING btree ("account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_account_trials_ends_at_idx"
    ON "agenda_account_trials" USING btree ("ends_at");
--> statement-breakpoint
WITH legacy_profile_trials AS (
    SELECT
        COALESCE(profile."account_id", personal_account."id") AS account_id,
        MIN(profile."created_at") AS started_at,
        MAX(profile."plan_expires_at") AS ends_at
    FROM "agenda_professional_profiles" AS profile
    LEFT JOIN "accounts" AS personal_account
        ON profile."account_id" IS NULL
        AND personal_account."owner_user_id" = profile."user_id"
        AND personal_account."is_personal" = true
    WHERE profile."plan_expires_at" IS NOT NULL
        AND profile."plan" = 'free'
        AND (profile."account_id" IS NOT NULL OR personal_account."id" IS NOT NULL)
    GROUP BY COALESCE(profile."account_id", personal_account."id")
)
INSERT INTO "agenda_account_trials" ("account_id", "started_at", "ends_at")
SELECT account_id, started_at, ends_at
FROM legacy_profile_trials
ON CONFLICT ("account_id") DO NOTHING;
