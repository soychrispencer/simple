ALTER TABLE public_profiles
ADD COLUMN IF NOT EXISTS timezone varchar(50) NOT NULL DEFAULT 'America/Santiago';
--> statement-breakpoint
UPDATE public_profiles
SET timezone = 'America/Santiago'
WHERE timezone IS NULL OR trim(timezone) = '';
