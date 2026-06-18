ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS facebook_page_id varchar(255);
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS facebook_page_name varchar(255);
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS facebook_page_access_token text;
