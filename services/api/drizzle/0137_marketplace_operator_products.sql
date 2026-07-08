CREATE TABLE IF NOT EXISTS marketplace_operator_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_profile_id uuid NOT NULL REFERENCES public_profiles(id) ON DELETE CASCADE,
  vertical varchar(20) NOT NULL,
  name varchar(160) NOT NULL,
  description text,
  image_url varchar(500),
  category varchar(40) NOT NULL DEFAULT 'other',
  price numeric(10, 2) NOT NULL,
  promo_price numeric(10, 2),
  currency varchar(10) NOT NULL DEFAULT 'CLP',
  stock integer,
  sku varchar(80),
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS marketplace_operator_products_profile_idx ON marketplace_operator_products(public_profile_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS marketplace_operator_products_vertical_active_idx ON marketplace_operator_products(vertical, is_active);
