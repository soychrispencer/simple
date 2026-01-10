-- Colapsa variantes de autos (SUV/Pickup/Van) hacia el tipo base Auto.
-- Esto permite que "Autos" sea el único tipo base, y que la carrocería viva en listings_vehicles.body_type.
-- Además elimina esos vehicle_types para que no aparezcan en la tabla.

DO $$
DECLARE
  auto_id uuid;
  suv_id uuid;
  pickup_id uuid;
  van_id uuid;
BEGIN
  SELECT id INTO auto_id FROM public.vehicle_types WHERE slug = 'auto' LIMIT 1;
  IF auto_id IS NULL THEN
    RAISE NOTICE 'No existe vehicle_types.slug=auto; no se puede colapsar.';
    RETURN;
  END IF;

  SELECT id INTO suv_id FROM public.vehicle_types WHERE slug = 'suv' LIMIT 1;
  SELECT id INTO pickup_id FROM public.vehicle_types WHERE slug = 'pickup' LIMIT 1;
  SELECT id INTO van_id FROM public.vehicle_types WHERE slug = 'van' LIMIT 1;

  -- Reasignar referencias en models
  UPDATE public.models
  SET vehicle_type_id = auto_id
  WHERE vehicle_type_id IN (suv_id, pickup_id, van_id);

  -- Reasignar referencias en listings_vehicles
  UPDATE public.listings_vehicles
  SET vehicle_type_id = auto_id
  WHERE vehicle_type_id IN (suv_id, pickup_id, van_id);

  -- Eliminar vehicle_types de variantes (si existen)
  DELETE FROM public.vehicle_types
  WHERE slug IN ('suv', 'pickup', 'van');
END $$;
