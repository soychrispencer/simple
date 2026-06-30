-- profile_picture_url y instagram_permalink cambian a text
-- porque las URLs CDN de Instagram superan varchar(500)
ALTER TABLE instagram_accounts ALTER COLUMN profile_picture_url TYPE text;
ALTER TABLE instagram_publications ALTER COLUMN instagram_permalink TYPE text;
