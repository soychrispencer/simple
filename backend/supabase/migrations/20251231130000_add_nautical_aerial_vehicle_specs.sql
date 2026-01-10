-- Agrega columnas dedicadas para specs náuticos y aéreos.
-- Mantiene compatibilidad: el wizard sigue guardando specs en listings.metadata->specs,
-- pero estas columnas permiten consultas/filtrado estructurado.

ALTER TABLE public.listings_vehicles
  ADD COLUMN IF NOT EXISTS nautical_type text,
  ADD COLUMN IF NOT EXISTS nautical_length_m numeric(8,2),
  ADD COLUMN IF NOT EXISTS nautical_beam_m numeric(8,2),
  ADD COLUMN IF NOT EXISTS nautical_engine_hours integer,
  ADD COLUMN IF NOT EXISTS nautical_propulsion text,
  ADD COLUMN IF NOT EXISTS nautical_hull_material text,
  ADD COLUMN IF NOT EXISTS nautical_passengers integer,
  ADD COLUMN IF NOT EXISTS nautical_cabins integer,

  ADD COLUMN IF NOT EXISTS aerial_type text,
  ADD COLUMN IF NOT EXISTS aerial_flight_hours integer,
  ADD COLUMN IF NOT EXISTS aerial_engine_count integer,
  ADD COLUMN IF NOT EXISTS aerial_registration text,
  ADD COLUMN IF NOT EXISTS aerial_max_takeoff_weight_kg integer,
  ADD COLUMN IF NOT EXISTS aerial_range_km integer;

-- Semilla incremental de nuevos vehicle_types base.
-- Se agrega en migración (no reescribimos el seed inicial).
INSERT INTO public.vehicle_types (name, slug, category, sort_order)
VALUES
  ('Náutico', 'nautico', 'nautical', 80),
  ('Aéreo', 'aereo', 'aerial', 90)
ON CONFLICT (slug) DO NOTHING;
