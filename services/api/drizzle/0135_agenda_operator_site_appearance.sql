ALTER TABLE agenda_professional_profiles
    ADD COLUMN IF NOT EXISTS operator_site_layout varchar(20) NOT NULL DEFAULT 'booking',
    ADD COLUMN IF NOT EXISTS operator_site_color_mode varchar(10) NOT NULL DEFAULT 'system';
