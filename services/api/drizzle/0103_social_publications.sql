CREATE TABLE IF NOT EXISTS social_publications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES accounts(id),
    user_id uuid NOT NULL REFERENCES users(id),
    vertical varchar(20) NOT NULL,
    listing_id varchar(255) NOT NULL,
    listing_title varchar(255) NOT NULL,
    platform varchar(20) NOT NULL,
    content_type varchar(20) NOT NULL DEFAULT 'link',
    external_id varchar(255),
    permalink text,
    caption text NOT NULL,
    media_url text,
    status varchar(20) NOT NULL DEFAULT 'published',
    error_message text,
    source_updated_at timestamp,
    published_at timestamp,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_publications_user_vertical_idx
    ON social_publications (user_id, vertical, created_at DESC);

CREATE INDEX IF NOT EXISTS social_publications_listing_idx
    ON social_publications (listing_id, platform, content_type);
