ALTER TABLE serenatas
    ADD COLUMN IF NOT EXISTS policy_agreed boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS policy_agreed_at timestamp;
