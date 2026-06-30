CREATE TABLE IF NOT EXISTS user_platform_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    app varchar(40) NOT NULL,
    role varchar(40) NOT NULL DEFAULT 'user',
    status varchar(20) NOT NULL DEFAULT 'active',
    origin varchar(255),
    first_seen_at timestamp NOT NULL DEFAULT now(),
    activated_at timestamp,
    last_login_at timestamp,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS user_platform_access_user_app_idx ON user_platform_access(user_id, app);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS user_platform_access_user_idx ON user_platform_access(user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS user_platform_access_app_idx ON user_platform_access(app);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS user_platform_access_status_idx ON user_platform_access(status);
--> statement-breakpoint
INSERT INTO user_platform_access (user_id, app, role, status, origin, activated_at, last_login_at, created_at, updated_at)
SELECT
    id,
    signup_app,
    CASE
        WHEN primary_vertical = 'agenda' THEN 'professional'
        WHEN primary_vertical IN ('autos', 'propiedades') THEN 'publisher'
        WHEN signup_app = 'simpleserenatas' THEN 'user'
        ELSE 'user'
    END,
    'active',
    signup_origin,
    COALESCE(last_login_at, created_at),
    last_login_at,
    created_at,
    updated_at
FROM users
WHERE signup_app IN ('simpleagenda', 'simpleautos', 'simplepropiedades', 'simpleserenatas')
ON CONFLICT (user_id, app) DO NOTHING;
