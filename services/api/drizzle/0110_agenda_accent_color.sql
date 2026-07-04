ALTER TABLE agenda_professional_profiles
ADD COLUMN IF NOT EXISTS operator_site_accent_color varchar(20) NOT NULL DEFAULT 'teal';
