-- Normaliza vehicle_types.category a las llaves base usadas por el wizard.
-- Esto es importante para bases ya creadas con categorías antiguas (passenger/light_truck/etc).

-- 1) Normalización por valores antiguos de category
UPDATE public.vehicle_types
SET category = CASE
  WHEN category IN ('passenger', 'light_truck') THEN 'car'
  WHEN category IN ('motorcycle') THEN 'motorcycle'
  WHEN category IN ('heavy_truck') THEN 'truck'
  WHEN category IN ('transit') THEN 'bus'
  -- Compat: bases antiguas podían usar 'industrial'
  WHEN category IN ('machinery', 'industrial') THEN 'machinery'
  WHEN category IN ('nautical') THEN 'nautical'
  WHEN category IN ('aerial') THEN 'aerial'
  -- Evita crear una 8va categoría visible
  WHEN category IN ('other') THEN 'car'
  ELSE category
END
WHERE category IS NOT NULL;

-- 2) Asegurar normalización por slug (por si category venía vacía o distinta)
UPDATE public.vehicle_types
SET category = CASE
  WHEN slug IN ('auto','suv','pickup','van') THEN 'car'
  WHEN slug IN ('moto') THEN 'motorcycle'
  WHEN slug IN ('camion') THEN 'truck'
  WHEN slug IN ('bus') THEN 'bus'
  WHEN slug IN ('maquinaria') THEN 'machinery'
  WHEN slug IN ('nautico') THEN 'nautical'
  WHEN slug IN ('aereo') THEN 'aerial'
  -- Evita crear una 8va categoría visible
  WHEN slug IN ('otro') THEN 'car'
  ELSE category
END
WHERE slug IS NOT NULL;

-- 3) Asegurar que existan los tipos base nuevos
INSERT INTO public.vehicle_types (name, slug, category, sort_order)
VALUES
  ('Náutico', 'nautico', 'nautical', 80),
  ('Aéreo', 'aereo', 'aerial', 90)
ON CONFLICT (slug) DO NOTHING;
