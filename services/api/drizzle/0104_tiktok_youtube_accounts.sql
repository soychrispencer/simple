CREATE TABLE IF NOT EXISTS tiktok_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES accounts(id),
    user_id uuid NOT NULL REFERENCES users(id),
    vertical varchar(20) NOT NULL,
    open_id varchar(255) NOT NULL,
    username varchar(255) NOT NULL,
    display_name varchar(255),
    avatar_url text,
    access_token text NOT NULL,
    refresh_token text,
    token_expires_at timestamp,
    scopes jsonb,
    status varchar(20) NOT NULL DEFAULT 'connected',
    last_synced_at timestamp,
    last_published_at timestamp,
    last_error text,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tiktok_accounts_user_vertical_idx
    ON tiktok_accounts (user_id, vertical);

CREATE TABLE IF NOT EXISTS youtube_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES accounts(id),
    user_id uuid NOT NULL REFERENCES users(id),
    vertical varchar(20) NOT NULL,
    channel_id varchar(255) NOT NULL,
    channel_title varchar(255) NOT NULL,
    channel_handle varchar(255),
    avatar_url text,
    access_token text NOT NULL,
    refresh_token text,
    token_expires_at timestamp,
    scopes jsonb,
    status varchar(20) NOT NULL DEFAULT 'connected',
    last_synced_at timestamp,
    last_published_at timestamp,
    last_error text,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS youtube_accounts_user_vertical_idx
    ON youtube_accounts (user_id, vertical);
