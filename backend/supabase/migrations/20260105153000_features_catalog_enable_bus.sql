-- Habilitar equipamiento (features_catalog) para tipos no-car
-- Actualmente el seed inicial fija allowed_types = {car}, lo que deja bus/truck/machinery/motorcycle/aerial/nautical sin opciones.
-- Esta migración agrega esos tipos a allowed_types para un set amplio de features genéricas.

DO $$
BEGIN
  -- Asegurar tabla existe (por si el orden de migraciones difiere en algún entorno)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'features_catalog'
  ) THEN
    RAISE NOTICE 'features_catalog no existe; omitiendo enable_bus';
    RETURN;
  END IF;

  UPDATE public.features_catalog
  SET allowed_types = (
    SELECT array_agg(DISTINCT t)
    FROM unnest(
      coalesce(public.features_catalog.allowed_types, '{}'::text[])
      || ARRAY['bus','truck','machinery','motorcycle','aerial','nautical']::text[]
    ) AS t
  )
  WHERE code IN (
    -- Seguridad
    'abs','esc','traction_control','hill_assist','tpms','isofix','alarm','immobilizer','central_lock','rear_defogger','dashcam',
    -- Airbags
    'airbags_front','airbags_side','airbags_curtain','airbags_knee',
    -- Asistencia / ADAS
    'reverse_camera','camera_360','parking_sensors_rear','parking_sensors_front','blind_spot','lane_keep','rear_cross_traffic',
    'adaptive_cruise','aeb','traffic_sign_recognition','driver_fatigue_alert',
    -- Confort
    'ac','climate_control','rear_ac','power_windows','power_mirrors','heated_mirrors','keyless_entry','push_start','remote_start',
    'cruise_control','auto_lights','auto_wipers','auto_dimming_mirror',
    -- Multimedia
    'bluetooth','usb','touchscreen','gps','apple_carplay','android_auto','premium_audio','wireless_charging','rear_entertainment',
    -- Exterior (genérico)
    'fog_lights','led_headlights','daytime_running_lights','tinted_windows'
  );
END $$;
