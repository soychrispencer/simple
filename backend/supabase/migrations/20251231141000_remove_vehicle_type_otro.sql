-- Elimina el tipo 'Otro' de vehicle_types.
-- Mantiene integridad: migra referencias a 'auto' antes de borrar.

DO $$
DECLARE
  otro_id uuid;
  auto_id uuid;
BEGIN
  SELECT id INTO otro_id FROM public.vehicle_types WHERE slug = 'otro' LIMIT 1;
  IF otro_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO auto_id FROM public.vehicle_types WHERE slug = 'auto' LIMIT 1;
  IF auto_id IS NULL THEN
    -- Si por algún motivo no existe 'auto', no borramos para evitar dejar FKs colgando.
    RAISE NOTICE 'No existe vehicle_types.slug=auto; no se elimina slug=otro.';
    RETURN;
  END IF;

  -- 1) Reasignar modelos
  UPDATE public.models
  SET vehicle_type_id = auto_id
  WHERE vehicle_type_id = otro_id;

  -- 2) Reasignar listings_vehicles (FK es ON DELETE SET NULL, pero preferimos mantener un tipo válido)
  UPDATE public.listings_vehicles
  SET vehicle_type_id = auto_id
  WHERE vehicle_type_id = otro_id;

  -- 3) Eliminar row
  DELETE FROM public.vehicle_types
  WHERE id = otro_id;
END $$;
