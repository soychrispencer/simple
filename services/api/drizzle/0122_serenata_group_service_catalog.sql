CREATE TABLE IF NOT EXISTS serenata_group_service_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_group_id uuid NOT NULL REFERENCES serenata_provider_groups(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  description text,
  image_url varchar(500),
  sessions_count integer NOT NULL DEFAULT 1,
  price integer NOT NULL,
  promo_price integer,
  currency varchar(8) NOT NULL DEFAULT 'CLP',
  applies_to varchar(10) NOT NULL DEFAULT 'all',
  service_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  validity_days integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS serenata_group_service_packs_provider_idx ON serenata_group_service_packs(provider_group_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS serenata_group_service_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_group_id uuid NOT NULL REFERENCES serenata_provider_groups(id) ON DELETE CASCADE,
  label varchar(120) NOT NULL,
  description text,
  discount_type varchar(10) NOT NULL DEFAULT 'percent',
  discount_value integer NOT NULL,
  applies_to varchar(10) NOT NULL DEFAULT 'all',
  service_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS serenata_group_service_promotions_provider_idx ON serenata_group_service_promotions(provider_group_id);
