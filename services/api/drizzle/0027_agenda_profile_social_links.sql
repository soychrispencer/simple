-- Add social media link columns to agenda_professional_profiles
ALTER TABLE agenda_professional_profiles ADD COLUMN IF NOT EXISTS website_url varchar(500);
ALTER TABLE agenda_professional_profiles ADD COLUMN IF NOT EXISTS instagram_url varchar(500);
ALTER TABLE agenda_professional_profiles ADD COLUMN IF NOT EXISTS facebook_url varchar(500);
ALTER TABLE agenda_professional_profiles ADD COLUMN IF NOT EXISTS linkedin_url varchar(500);
ALTER TABLE agenda_professional_profiles ADD COLUMN IF NOT EXISTS tiktok_url varchar(500);
ALTER TABLE agenda_professional_profiles ADD COLUMN IF NOT EXISTS youtube_url varchar(500);
ALTER TABLE agenda_professional_profiles ADD COLUMN IF NOT EXISTS twitter_url varchar(500);
