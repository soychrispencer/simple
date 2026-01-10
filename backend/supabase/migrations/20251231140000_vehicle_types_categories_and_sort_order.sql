-- Normaliza vehicle_types.category a las 7 llaves base y ajusta sort_order por importancia.
-- Objetivo: que SearchBox, filtros avanzados y wizard se construyan desde la tabla.

-- 1) Normalización por category legacy
UPDATE public.vehicle_types
SET category = CASE
  WHEN category IN ('passenger', 'light_truck') THEN 'car'
  WHEN category IN ('motorcycle') THEN 'motorcycle'
  WHEN category IN ('heavy_truck') THEN 'truck'
  WHEN category IN ('transit') THEN 'bus'
  WHEN category IN ('industrial', 'machinery') THEN 'machinery'
  WHEN category IN ('nautical') THEN 'nautical'
  WHEN category IN ('aerial') THEN 'aerial'
  WHEN category IN ('other') THEN 'car'
  ELSE category
END
WHERE category IS NOT NULL;

-- 2) Normalización por slug (por si category venía vacía o distinta)
UPDATE public.vehicle_types
SET category = CASE
  WHEN slug IN ('auto','suv','pickup','van') THEN 'car'
  WHEN slug IN ('moto') THEN 'motorcycle'
  WHEN slug IN ('camion') THEN 'truck'
  WHEN slug IN ('bus') THEN 'bus'
  WHEN slug IN ('maquinaria') THEN 'machinery'
  WHEN slug IN ('nautico') THEN 'nautical'
  WHEN slug IN ('aereo') THEN 'aerial'
  WHEN slug IN ('otro') THEN 'car'
  ELSE category
END
WHERE slug IS NOT NULL;

-- 3) Asegurar que existan los tipos base (si faltan)
INSERT INTO public.vehicle_types (name, slug, category, sort_order)
VALUES
  ('Náutico', 'nautico', 'nautical', 70),
  ('Aéreo', 'aereo', 'aerial', 60)
ON CONFLICT (slug) DO NOTHING;

-- 4) sort_order por importancia (Autos primero)
-- Nota: el UI agrupa por category; este orden hace que nuevos tipos queden consistentes.
UPDATE public.vehicle_types
SET sort_order = CASE
  WHEN category = 'car' THEN 10
  WHEN category = 'bus' THEN 20
  WHEN category = 'motorcycle' THEN 30
  WHEN category = 'truck' THEN 40
  WHEN category = 'machinery' THEN 50
  WHEN category = 'aerial' THEN 60
  WHEN category = 'nautical' THEN 70
  ELSE 999
END;

-- 5) (Opcional/seguro) Refinar orden interno de variantes de autos
-- Deja auto primero, luego suv/pickup/van; no crea nuevas categorías.
UPDATE public.vehicle_types
SET sort_order = CASE
  WHEN slug = 'auto' THEN 10
  WHEN slug = 'suv' THEN 11
  WHEN slug = 'pickup' THEN 12
  WHEN slug = 'van' THEN 13
  ELSE sort_order
END
WHERE category = 'car';
