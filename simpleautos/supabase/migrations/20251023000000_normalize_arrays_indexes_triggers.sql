-- Migration: 20251023000000_normalize_arrays_indexes_triggers.sql
-- Description: Add performance indexes, constraints, triggers, and vehicle_media table
-- Date: 2025-10-23
-- Author: GitHub Copilot

-- 1) Ensure extensions and enums
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
    CREATE TYPE vehicle_status AS ENUM ('draft','active','paused','expired','sold','deleted');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_condition') THEN
    CREATE TYPE vehicle_condition AS ENUM ('new','semi_new','used','restored','collection','damaged','repair','unknown');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'boost_status') THEN
    CREATE TYPE boost_status AS ENUM ('active','expired','paused','cancelled');
  END IF;
END$$;

-- 2) Create vehicle_media table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.vehicle_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image','video','document')),
  url text NOT NULL,
  title text,
  description text,
  is_primary boolean DEFAULT false,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for vehicle_media
CREATE INDEX IF NOT EXISTS idx_vehicle_media_vehicle_id ON public.vehicle_media(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_media_type ON public.vehicle_media(type);

-- 3) Add performance indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_type_brand_model_price_year ON public.vehicles(type_id, brand_id, model_id, price, year);
CREATE INDEX IF NOT EXISTS idx_vehicles_featured_visibility ON public.vehicles(featured DESC, visibility, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_region_commune ON public.vehicles(owner_id, region_id, commune_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
-- Note: ux_boost_daily_stats_boost_date already exists in schema

-- 4) Add constraints and validations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ux_brand_model') THEN
    ALTER TABLE public.models ADD CONSTRAINT ux_brand_model UNIQUE(brand_id, name);
  END IF;
END$$;

-- 5) Add updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vehicle_media_updated_at ON public.vehicle_media;
CREATE TRIGGER trg_vehicle_media_updated_at
    BEFORE UPDATE ON public.vehicle_media
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6) Sync trigger for vehicles -> commercial_conditions
CREATE OR REPLACE FUNCTION sync_vehicle_commercial_flags()
RETURNS trigger AS $$
BEGIN
  -- Insert or update commercial_conditions minimal row
  INSERT INTO public.commercial_conditions (vehicle_id, price, negotiable, allows_tradein, delivery_immediate, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.price, 0),
    COALESCE(NEW.negotiable, false),
    COALESCE(NEW.allow_exchange, false),
    COALESCE(NEW.allow_financing, false),
    now(),
    now()
  )
  ON CONFLICT (vehicle_id) DO UPDATE SET
    price = EXCLUDED.price,
    negotiable = EXCLUDED.negotiable,
    allows_tradein = EXCLUDED.allows_tradein,
    delivery_immediate = EXCLUDED.delivery_immediate,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_vehicle_commercial ON public.vehicles;
CREATE TRIGGER trg_sync_vehicle_commercial
AFTER INSERT OR UPDATE ON public.vehicles
FOR EACH ROW EXECUTE PROCEDURE sync_vehicle_commercial_flags();

-- 7) Add RLS policies (if not already present)
-- Note: These are examples - adjust based on your auth requirements
ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view vehicle media" ON public.vehicle_media;
CREATE POLICY "Users can view vehicle media" ON public.vehicle_media
    FOR SELECT USING (true); -- Public read for now

DROP POLICY IF EXISTS "Owners can manage their vehicle media" ON public.vehicle_media;
CREATE POLICY "Owners can manage their vehicle media" ON public.vehicle_media
    FOR ALL USING (
        vehicle_id IN (
            SELECT id FROM public.vehicles WHERE owner_id = auth.uid()
        )
    );

-- 8) Add comments for documentation
COMMENT ON TABLE public.vehicle_media IS 'Consolidated media storage for vehicles (images, videos, documents)';
COMMENT ON COLUMN public.vehicle_media.type IS 'Media type: image, video, or document';
COMMENT ON COLUMN public.vehicle_media.is_primary IS 'Whether this is the primary media for the vehicle';
COMMENT ON COLUMN public.vehicle_media.position IS 'Display order for media items';