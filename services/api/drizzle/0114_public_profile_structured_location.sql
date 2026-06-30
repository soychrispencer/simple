ALTER TABLE public_profiles
ADD COLUMN IF NOT EXISTS country_code varchar(3) NOT NULL DEFAULT 'CL';

ALTER TABLE public_profiles
ADD COLUMN IF NOT EXISTS region_id varchar(50);

ALTER TABLE public_profiles
ADD COLUMN IF NOT EXISTS locality_id varchar(50);
