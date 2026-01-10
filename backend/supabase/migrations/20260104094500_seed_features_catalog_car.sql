-- Seed de equipamiento (features_catalog) para Autos (car)
-- Incluye categorías (A) + scoping opcional por carrocería (B) vía allowed_body_types

-- Crear tabla si no existe (para entornos nuevos/desincronizados)
CREATE TABLE IF NOT EXISTS public.features_catalog (
  code text PRIMARY KEY,
  label text NOT NULL,
  category text NULL,
  sort_order integer NULL,
  active boolean NULL DEFAULT true,
  allowed_types text[] NULL,
  allowed_body_types text[] NULL
);

-- Si la tabla ya existía pero con schema incompleto, aseguramos columnas necesarias
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'features_catalog'
  ) THEN
    ALTER TABLE public.features_catalog
      ADD COLUMN IF NOT EXISTS category text NULL;

    ALTER TABLE public.features_catalog
      ADD COLUMN IF NOT EXISTS sort_order integer NULL;

    ALTER TABLE public.features_catalog
      ADD COLUMN IF NOT EXISTS active boolean NULL DEFAULT true;

    ALTER TABLE public.features_catalog
      ADD COLUMN IF NOT EXISTS allowed_types text[] NULL;

    ALTER TABLE public.features_catalog
      ADD COLUMN IF NOT EXISTS allowed_body_types text[] NULL;
  END IF;
END $$;

-- Asegurar índice único por code (por si la PK no existía en algún entorno)
CREATE UNIQUE INDEX IF NOT EXISTS features_catalog_code_uniq
  ON public.features_catalog (code);

-- Índices para filtros por arrays
CREATE INDEX IF NOT EXISTS features_catalog_allowed_types_gin
  ON public.features_catalog
  USING gin (allowed_types);

CREATE INDEX IF NOT EXISTS features_catalog_allowed_body_types_gin
  ON public.features_catalog
  USING gin (allowed_body_types);

-- Upsert helper: usamos ON CONFLICT (code) para mantener idempotencia
-- Nota: allowed_types = NULL => visible para cualquier tipo; aquí lo fijamos a {car}.

INSERT INTO public.features_catalog (code, label, category, sort_order, active, allowed_types, allowed_body_types) VALUES
  -- Seguridad
  ('abs', 'ABS', 'Seguridad', 10, true, ARRAY['car'], NULL),
  ('esc', 'Control de estabilidad (ESC)', 'Seguridad', 11, true, ARRAY['car'], NULL),
  ('traction_control', 'Control de tracción', 'Seguridad', 12, true, ARRAY['car'], NULL),
  ('hill_assist', 'Asistente de partida en pendiente', 'Seguridad', 13, true, ARRAY['car'], NULL),
  ('hill_descent', 'Control de descenso', 'Seguridad', 14, true, ARRAY['car'], ARRAY['suv','pickup']),
  ('tpms', 'Sensor presión neumáticos (TPMS)', 'Seguridad', 15, true, ARRAY['car'], NULL),
  ('isofix', 'ISOFIX', 'Seguridad', 16, true, ARRAY['car'], NULL),
  ('alarm', 'Alarma', 'Seguridad', 17, true, ARRAY['car'], NULL),
  ('immobilizer', 'Inmovilizador', 'Seguridad', 18, true, ARRAY['car'], NULL),
  ('central_lock', 'Cierre centralizado', 'Seguridad', 19, true, ARRAY['car'], NULL),
  ('rear_defogger', 'Desempañador trasero', 'Seguridad', 20, true, ARRAY['car'], NULL),
  ('dashcam', 'Cámara (dashcam)', 'Seguridad', 21, true, ARRAY['car'], NULL),

  -- Airbags
  ('airbags_front', 'Airbags delanteros', 'Airbags', 30, true, ARRAY['car'], NULL),
  ('airbags_side', 'Airbags laterales', 'Airbags', 31, true, ARRAY['car'], NULL),
  ('airbags_curtain', 'Airbags de cortina', 'Airbags', 32, true, ARRAY['car'], NULL),
  ('airbags_knee', 'Airbag de rodilla', 'Airbags', 33, true, ARRAY['car'], NULL),

  -- ADAS
  ('reverse_camera', 'Cámara de retroceso', 'Asistencia', 50, true, ARRAY['car'], NULL),
  ('camera_360', 'Cámara 360°', 'Asistencia', 51, true, ARRAY['car'], NULL),
  ('parking_sensors_rear', 'Sensores de retroceso', 'Asistencia', 52, true, ARRAY['car'], NULL),
  ('parking_sensors_front', 'Sensores delanteros', 'Asistencia', 53, true, ARRAY['car'], NULL),
  ('blind_spot', 'Monitor de punto ciego', 'Asistencia', 54, true, ARRAY['car'], NULL),
  ('lane_keep', 'Asistente de mantenimiento de carril', 'Asistencia', 55, true, ARRAY['car'], NULL),
  ('rear_cross_traffic', 'Alerta tráfico cruzado trasero', 'Asistencia', 56, true, ARRAY['car'], NULL),
  ('adaptive_cruise', 'Control crucero adaptativo', 'Asistencia', 57, true, ARRAY['car'], NULL),
  ('aeb', 'Frenado autónomo de emergencia (AEB)', 'Asistencia', 58, true, ARRAY['car'], NULL),
  ('traffic_sign_recognition', 'Reconocimiento de señales', 'Asistencia', 59, true, ARRAY['car'], NULL),
  ('driver_fatigue_alert', 'Alerta de cansancio', 'Asistencia', 60, true, ARRAY['car'], NULL),

  -- Confort
  ('ac', 'Aire acondicionado', 'Confort', 70, true, ARRAY['car'], NULL),
  ('climate_control', 'Climatizador', 'Confort', 71, true, ARRAY['car'], NULL),
  ('rear_ac', 'A/C trasero', 'Confort', 72, true, ARRAY['car'], ARRAY['suv','van','minivan','motorhome']),
  ('power_windows', 'Alzavidrios eléctricos', 'Confort', 73, true, ARRAY['car'], NULL),
  ('power_mirrors', 'Espejos eléctricos', 'Confort', 74, true, ARRAY['car'], NULL),
  ('heated_mirrors', 'Espejos calefaccionados', 'Confort', 75, true, ARRAY['car'], NULL),
  ('keyless_entry', 'Acceso sin llave', 'Confort', 76, true, ARRAY['car'], NULL),
  ('push_start', 'Encendido por botón', 'Confort', 77, true, ARRAY['car'], NULL),
  ('remote_start', 'Encendido remoto', 'Confort', 78, true, ARRAY['car'], NULL),
  ('cruise_control', 'Control crucero', 'Confort', 79, true, ARRAY['car'], NULL),
  ('auto_lights', 'Luces automáticas', 'Confort', 80, true, ARRAY['car'], NULL),
  ('auto_wipers', 'Sensor de lluvia', 'Confort', 81, true, ARRAY['car'], NULL),
  ('power_tailgate', 'Portalón eléctrico', 'Confort', 82, true, ARRAY['car'], ARRAY['suv','wagon','van','minivan','motorhome']),
  ('auto_dimming_mirror', 'Espejo retrovisor electrocrómico', 'Confort', 83, true, ARRAY['car'], NULL),

  -- Interior
  ('leather_seats', 'Asientos de cuero', 'Interior', 90, true, ARRAY['car'], NULL),
  ('heated_seats', 'Asientos calefaccionados', 'Interior', 91, true, ARRAY['car'], NULL),
  ('ventilated_seats', 'Asientos ventilados', 'Interior', 92, true, ARRAY['car'], NULL),
  ('power_seat_driver', 'Asiento conductor eléctrico', 'Interior', 93, true, ARRAY['car'], NULL),
  ('memory_seat_driver', 'Memoria asiento conductor', 'Interior', 94, true, ARRAY['car'], NULL),
  ('heated_steering_wheel', 'Volante calefaccionado', 'Interior', 95, true, ARRAY['car'], NULL),
  ('multifunction_steering_wheel', 'Volante multifunción', 'Interior', 96, true, ARRAY['car'], NULL),
  ('third_row', 'Tercera corrida de asientos', 'Interior', 97, true, ARRAY['car'], ARRAY['suv','van','minivan']),
  ('ambient_lighting', 'Iluminación ambiental', 'Interior', 98, true, ARRAY['car'], NULL),

  -- Multimedia
  ('bluetooth', 'Bluetooth', 'Multimedia', 110, true, ARRAY['car'], NULL),
  ('usb', 'USB', 'Multimedia', 111, true, ARRAY['car'], NULL),
  ('touchscreen', 'Pantalla táctil', 'Multimedia', 112, true, ARRAY['car'], NULL),
  ('gps', 'GPS / Navegación', 'Multimedia', 113, true, ARRAY['car'], NULL),
  ('apple_carplay', 'Apple CarPlay', 'Multimedia', 114, true, ARRAY['car'], NULL),
  ('android_auto', 'Android Auto', 'Multimedia', 115, true, ARRAY['car'], NULL),
  ('premium_audio', 'Audio premium', 'Multimedia', 116, true, ARRAY['car'], NULL),
  ('wireless_charging', 'Carga inalámbrica', 'Multimedia', 117, true, ARRAY['car'], NULL),
  ('rear_entertainment', 'Pantallas traseras', 'Multimedia', 118, true, ARRAY['car'], ARRAY['suv','van','minivan','motorhome']),

  -- Exterior
  ('fog_lights', 'Neblineros', 'Exterior', 130, true, ARRAY['car'], NULL),
  ('led_headlights', 'Faros LED', 'Exterior', 131, true, ARRAY['car'], NULL),
  ('daytime_running_lights', 'Luces diurnas (DRL)', 'Exterior', 132, true, ARRAY['car'], NULL),
  ('sunroof', 'Sunroof', 'Exterior', 133, true, ARRAY['car'], NULL),
  ('panoramic_roof', 'Techo panorámico', 'Exterior', 134, true, ARRAY['car'], NULL),
  ('roof_rails', 'Barras de techo', 'Exterior', 135, true, ARRAY['car'], ARRAY['suv','wagon','van','minivan','motorhome']),
  ('tow_hitch', 'Gancho de remolque', 'Exterior', 136, true, ARRAY['car'], ARRAY['suv','pickup','motorhome','van']),
  ('alloy_wheels', 'Llantas de aleación', 'Exterior', 137, true, ARRAY['car'], NULL),
  ('running_boards', 'Estribos', 'Exterior', 138, true, ARRAY['car'], ARRAY['suv','pickup','motorhome']),
  ('tinted_windows', 'Vidrios polarizados', 'Exterior', 139, true, ARRAY['car'], NULL),

  -- Sedán / Hatch / Wagon / Coupé / Convertible
  ('cargo_cover', 'Cubierta maletero (cubre-equipaje)', 'Carga', 160, true, ARRAY['car'], ARRAY['wagon','hatchback']),
  ('cargo_net', 'Red de carga', 'Carga', 161, true, ARRAY['car'], ARRAY['suv','wagon','van','minivan','motorhome']),
  ('power_top', 'Techo eléctrico', 'Convertible', 162, true, ARRAY['car'], ARRAY['convertible']),
  ('wind_deflector', 'Deflector de viento', 'Convertible', 163, true, ARRAY['car'], ARRAY['convertible']),

  -- Off-road / Pickup
  ('diff_lock', 'Bloqueo de diferencial', '4x4 / Off-road', 150, true, ARRAY['car'], ARRAY['pickup','suv']),
  ('low_range', 'Reductora (4L)', '4x4 / Off-road', 151, true, ARRAY['car'], ARRAY['pickup','suv']),
  ('offroad_modes', 'Modos off-road', '4x4 / Off-road', 152, true, ARRAY['car'], ARRAY['pickup','suv']),
  ('skid_plates', 'Protecciones inferiores', '4x4 / Off-road', 153, true, ARRAY['car'], ARRAY['pickup','suv']),
  ('winch', 'Winche', '4x4 / Off-road', 154, true, ARRAY['car'], ARRAY['pickup']),
  ('bedliner', 'Bedliner (protección caja)', 'Pickup', 170, true, ARRAY['car'], ARRAY['pickup']),
  ('roll_bar', 'Barra antivuelco', 'Pickup', 171, true, ARRAY['car'], ARRAY['pickup']),
  ('bed_cover', 'Cobertor de caja', 'Pickup', 172, true, ARRAY['car'], ARRAY['pickup']),
  ('spray_in_bedliner', 'Protección caja (spray)', 'Pickup', 173, true, ARRAY['car'], ARRAY['pickup']),

  -- Van / Minivan
  ('sliding_doors', 'Puertas correderas', 'Van / Minivan', 190, true, ARRAY['car'], ARRAY['van','minivan']),
  ('power_sliding_doors', 'Puertas correderas eléctricas', 'Van / Minivan', 191, true, ARRAY['car'], ARRAY['van','minivan']),
  ('captain_seats', 'Asientos tipo capitán', 'Van / Minivan', 192, true, ARRAY['car'], ARRAY['minivan']),
  ('fold_flat_seats', 'Asientos abatibles', 'Van / Minivan', 193, true, ARRAY['car'], ARRAY['van','minivan','suv']),
  ('curtains', 'Cortinas', 'Van / Minivan', 194, true, ARRAY['car'], ARRAY['van','minivan','motorhome']),

  -- Motorhome
  ('awning', 'Toldo', 'Motorhome', 210, true, ARRAY['car'], ARRAY['motorhome']),
  ('solar_panels', 'Paneles solares', 'Motorhome', 211, true, ARRAY['car'], ARRAY['motorhome']),
  ('house_battery', 'Batería auxiliar', 'Motorhome', 212, true, ARRAY['car'], ARRAY['motorhome']),
  ('inverter', 'Inversor', 'Motorhome', 213, true, ARRAY['car'], ARRAY['motorhome']),
  ('generator', 'Generador', 'Motorhome', 214, true, ARRAY['car'], ARRAY['motorhome']),
  ('fresh_water_tank', 'Estanque agua limpia', 'Motorhome', 215, true, ARRAY['car'], ARRAY['motorhome']),
  ('gray_water_tank', 'Estanque aguas grises', 'Motorhome', 216, true, ARRAY['car'], ARRAY['motorhome']),
  ('kitchen', 'Cocina', 'Motorhome', 217, true, ARRAY['car'], ARRAY['motorhome']),
  ('fridge', 'Refrigerador', 'Motorhome', 218, true, ARRAY['car'], ARRAY['motorhome']),
  ('bathroom', 'Baño', 'Motorhome', 219, true, ARRAY['car'], ARRAY['motorhome']),
  ('shower', 'Ducha', 'Motorhome', 220, true, ARRAY['car'], ARRAY['motorhome']),
  ('heater', 'Calefacción', 'Motorhome', 221, true, ARRAY['car'], ARRAY['motorhome']),
  ('hot_water', 'Agua caliente', 'Motorhome', 222, true, ARRAY['car'], ARRAY['motorhome']),
  ('toilet_cassette', 'WC químico', 'Motorhome', 223, true, ARRAY['car'], ARRAY['motorhome']),
  ('tv', 'TV', 'Motorhome', 224, true, ARRAY['car'], ARRAY['motorhome'])

ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  allowed_types = EXCLUDED.allowed_types,
  allowed_body_types = EXCLUDED.allowed_body_types;
