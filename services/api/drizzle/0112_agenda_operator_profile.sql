ALTER TABLE agenda_professional_profiles
ADD COLUMN IF NOT EXISTS account_kind varchar(20) NOT NULL DEFAULT 'individual';

ALTER TABLE agenda_professional_profiles
ADD COLUMN IF NOT EXISTS operator_subtype varchar(40);
