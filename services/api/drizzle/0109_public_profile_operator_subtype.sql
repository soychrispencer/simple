ALTER TABLE public_profiles
ADD COLUMN IF NOT EXISTS operator_subtype varchar(40);
