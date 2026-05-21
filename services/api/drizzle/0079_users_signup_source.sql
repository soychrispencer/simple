ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_app varchar(40);
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_origin varchar(255);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_signup_app_idx ON users(signup_app);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_signup_origin_idx ON users(signup_origin);
