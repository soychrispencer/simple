CREATE TABLE IF NOT EXISTS marketplace_operator_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_profile_id uuid NOT NULL REFERENCES public_profiles(id) ON DELETE CASCADE,
  vertical varchar(20) NOT NULL,
  name varchar(160) NOT NULL,
  description text,
  image_url varchar(500),
  category varchar(40) NOT NULL DEFAULT 'other',
  pricing_mode varchar(16) NOT NULL DEFAULT 'fixed',
  price numeric(10, 2),
  promo_price numeric(10, 2),
  currency varchar(10) NOT NULL DEFAULT 'CLP',
  duration_minutes integer,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS marketplace_operator_services_profile_idx ON marketplace_operator_services(public_profile_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS marketplace_operator_services_vertical_active_idx ON marketplace_operator_services(vertical, is_active);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS marketplace_operator_service_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_profile_id uuid NOT NULL REFERENCES public_profiles(id) ON DELETE CASCADE,
  vertical varchar(20) NOT NULL,
  name varchar(160) NOT NULL,
  description text,
  image_url varchar(500),
  sessions_count integer NOT NULL DEFAULT 1,
  price numeric(10, 2) NOT NULL,
  promo_price numeric(10, 2),
  currency varchar(10) NOT NULL DEFAULT 'CLP',
  applies_to varchar(10) NOT NULL DEFAULT 'all',
  service_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  validity_days integer,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS marketplace_operator_service_packs_profile_idx ON marketplace_operator_service_packs(public_profile_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS marketplace_operator_service_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_profile_id uuid NOT NULL REFERENCES public_profiles(id) ON DELETE CASCADE,
  vertical varchar(20) NOT NULL,
  label varchar(120) NOT NULL,
  description text,
  discount_type varchar(10) NOT NULL DEFAULT 'percent',
  discount_value numeric(10, 2) NOT NULL,
  applies_to varchar(10) NOT NULL DEFAULT 'all',
  service_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS marketplace_operator_service_promotions_profile_idx ON marketplace_operator_service_promotions(public_profile_id);
