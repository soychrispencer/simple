ALTER TABLE public_profiles
ADD COLUMN IF NOT EXISTS operator_subtype_custom varchar(160);
