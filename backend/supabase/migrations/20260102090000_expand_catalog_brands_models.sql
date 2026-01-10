-- Expansión de catálogo (marcas/modelos) para mejorar cobertura del wizard.
-- Idempotente: inserta con ON CONFLICT DO NOTHING.

DO $$
DECLARE
  auto_type_id uuid;
  bus_type_id uuid;
  camion_type_id uuid;
  maquinaria_type_id uuid;
  moto_type_id uuid;
  aerial_type_id uuid;
  nautical_type_id uuid;
BEGIN
  SELECT id INTO auto_type_id FROM public.vehicle_types WHERE slug = 'auto' LIMIT 1;
  SELECT id INTO bus_type_id FROM public.vehicle_types WHERE slug = 'bus' LIMIT 1;
  SELECT id INTO camion_type_id FROM public.vehicle_types WHERE slug = 'camion' LIMIT 1;
  SELECT id INTO maquinaria_type_id FROM public.vehicle_types WHERE slug = 'maquinaria' LIMIT 1;
  SELECT id INTO moto_type_id FROM public.vehicle_types WHERE slug = 'moto' LIMIT 1;
  SELECT id INTO aerial_type_id FROM public.vehicle_types WHERE slug = 'aereo' LIMIT 1;
  SELECT id INTO nautical_type_id FROM public.vehicle_types WHERE slug = 'nautico' LIMIT 1;

  -- 1) Marcas: agregar un set amplio (sin afectar las existentes)
  INSERT INTO public.brands (name, is_active) VALUES
    -- Moto
    ('BMW Motorrad', true),
    ('Ducati', true),
    ('Triumph', true),
    ('KTM', true),
    ('Husqvarna Motorcycles', true),
    ('Aprilia', true),
    ('Piaggio', true),
    ('Vespa', true),
    ('Moto Guzzi', true),
    ('Indian Motorcycle', true),
    ('Zero Motorcycles', true),
    -- Maquinaria
    ('Volvo Construction Equipment', true),
    ('Hitachi Construction Machinery', true),
    ('Kubota', true),
    ('SANY', true),
    ('XCMG', true),
    ('JLG', true),
    ('Genie', true),
    -- Camión
    ('Mitsubishi Fuso', true),
    ('UD Trucks', true),
    ('Foton', true),
    ('FAW', true),
    ('Sinotruk', true),
    ('Shacman', true),
    ('JMC', true),
    -- Bus
    ('Iveco Bus', true),
    ('Scania Buses', true),
    ('MAN Bus', true),
    ('Alexander Dennis', true),
    -- Náutico
    ('Tracker Boats', true),
    ('Ranger Boats', true),
    ('Lund', true),
    ('Alumacraft', true),
    ('Grady-White', true),
    ('Chaparral', true),
    ('Chris-Craft', true),
    ('Rinker', true),
    ('Brunswick', true),
    ('Brig', true),
    ('AB Inflatables', true)
  ON CONFLICT (name) DO NOTHING;

  -- 2) Modelos: seeding adicional por tipo

  -- Moto (agrega modelos populares para ampliar cobertura)
  IF moto_type_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
      ((SELECT id FROM public.brands WHERE name = 'BMW Motorrad'), 'G 310 R', moto_type_id, 2016, NULL),
      ((SELECT id FROM public.brands WHERE name = 'BMW Motorrad'), 'F 750 GS', moto_type_id, 2018, NULL),
      ((SELECT id FROM public.brands WHERE name = 'BMW Motorrad'), 'R 1250 GS', moto_type_id, 2018, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Ducati'), 'Monster', moto_type_id, 1993, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Ducati'), 'Panigale V4', moto_type_id, 2018, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Ducati'), 'Multistrada', moto_type_id, 2003, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Triumph'), 'Street Triple', moto_type_id, 2007, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Triumph'), 'Tiger 900', moto_type_id, 2020, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Triumph'), 'Bonneville T120', moto_type_id, 2016, NULL),

      ((SELECT id FROM public.brands WHERE name = 'KTM'), '390 Duke', moto_type_id, 2013, NULL),
      ((SELECT id FROM public.brands WHERE name = 'KTM'), '790 Duke', moto_type_id, 2018, NULL),
      ((SELECT id FROM public.brands WHERE name = 'KTM'), '1290 Super Adventure', moto_type_id, 2015, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Husqvarna Motorcycles'), 'Svartpilen 401', moto_type_id, 2018, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Husqvarna Motorcycles'), 'Vitpilen 401', moto_type_id, 2018, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Aprilia'), 'RS 660', moto_type_id, 2020, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Aprilia'), 'Tuono 660', moto_type_id, 2021, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Piaggio'), 'Liberty', moto_type_id, 1997, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Vespa'), 'Primavera', moto_type_id, 1968, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Vespa'), 'GTS', moto_type_id, 2003, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Moto Guzzi'), 'V7', moto_type_id, 1967, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Indian Motorcycle'), 'Scout', moto_type_id, 2014, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Zero Motorcycles'), 'SR/F', moto_type_id, 2019, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Maquinaria
  IF maquinaria_type_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
      ((SELECT id FROM public.brands WHERE name = 'Volvo Construction Equipment'), 'EC220E', maquinaria_type_id, 2016, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Volvo Construction Equipment'), 'L120H', maquinaria_type_id, 2014, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Hitachi Construction Machinery'), 'ZX200', maquinaria_type_id, 2000, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Hitachi Construction Machinery'), 'ZX350', maquinaria_type_id, 2004, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Kubota'), 'KX057', maquinaria_type_id, 2013, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Kubota'), 'SVL75', maquinaria_type_id, 2010, NULL),

      ((SELECT id FROM public.brands WHERE name = 'SANY'), 'SY215', maquinaria_type_id, 2009, NULL),
      ((SELECT id FROM public.brands WHERE name = 'XCMG'), 'XE215', maquinaria_type_id, 2010, NULL),

      ((SELECT id FROM public.brands WHERE name = 'JLG'), '660SJ', maquinaria_type_id, 2000, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Genie'), 'GS-1930', maquinaria_type_id, 2000, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Camión
  IF camion_type_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
      ((SELECT id FROM public.brands WHERE name = 'Mitsubishi Fuso'), 'Canter', camion_type_id, 1963, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Mitsubishi Fuso'), 'Fighter', camion_type_id, 1984, NULL),

      ((SELECT id FROM public.brands WHERE name = 'UD Trucks'), 'Quon', camion_type_id, 2004, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Foton'), 'Aumark', camion_type_id, 2004, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Foton'), 'Auman', camion_type_id, 2002, NULL),

      ((SELECT id FROM public.brands WHERE name = 'FAW'), 'J6', camion_type_id, 2007, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Sinotruk'), 'Howo', camion_type_id, 2004, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Shacman'), 'F3000', camion_type_id, 2009, NULL),
      ((SELECT id FROM public.brands WHERE name = 'JMC'), 'Carrying', camion_type_id, 2004, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Bus
  IF bus_type_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
      ((SELECT id FROM public.brands WHERE name = 'Iveco Bus'), 'Crossway', bus_type_id, 2006, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Iveco Bus'), 'Urbanway', bus_type_id, 2013, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Scania Buses'), 'K Series', bus_type_id, 2006, NULL),

      ((SELECT id FROM public.brands WHERE name = 'MAN Bus'), 'Lion''s City', bus_type_id, 1996, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Alexander Dennis'), 'Enviro200', bus_type_id, 2003, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Alexander Dennis'), 'Enviro500', bus_type_id, 2002, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Aéreo: agregar más modelos a marcas que ya existen/son comunes
  IF aerial_type_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
      ((SELECT id FROM public.brands WHERE name = 'Airbus'), 'A380', aerial_type_id, 2007, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Boeing'), '757', aerial_type_id, 1983, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Boeing'), '767', aerial_type_id, 1981, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Embraer'), 'E195-E2', aerial_type_id, 2019, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Bombardier'), 'Global 6000', aerial_type_id, 2011, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Cessna'), 'Citation Latitude', aerial_type_id, 2015, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Náutico: más modelos por marca (para que no quede 1-2 por marca)
  IF nautical_type_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
      ((SELECT id FROM public.brands WHERE name = 'Sea-Doo'), 'GTI', nautical_type_id, 2006, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Sea-Doo'), 'Fish Pro', nautical_type_id, 2018, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Kawasaki Jet Ski'), 'STX 160', nautical_type_id, 2020, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Yamaha Marine'), 'FX Cruiser HO', nautical_type_id, 2004, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Yamaha Marine'), 'GP1800R', nautical_type_id, 2017, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Mercury Marine'), 'Pro XS 200', nautical_type_id, 2016, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Zodiac'), 'Medline 660', nautical_type_id, 2015, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Beneteau'), 'Flyer 8', nautical_type_id, 2018, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Jeanneau'), 'Sun Odyssey 410', nautical_type_id, 2018, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Azimut'), 'Azimut 62', nautical_type_id, 2005, NULL),

      ((SELECT id FROM public.brands WHERE name = 'Tracker Boats'), 'Pro Team 175 TXW', nautical_type_id, 2000, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Ranger Boats'), 'Z520L', nautical_type_id, 2014, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Lund'), '1675 Impact', nautical_type_id, 2008, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Alumacraft'), 'Competitor 165', nautical_type_id, 2000, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Grady-White'), 'Freedom 235', nautical_type_id, 2015, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Chaparral'), '19 SSi', nautical_type_id, 2000, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Chris-Craft'), 'Launch 28 GT', nautical_type_id, 2014, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Rinker'), 'QX29', nautical_type_id, 2018, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Brig'), 'Eagle 6', nautical_type_id, 2010, NULL),
      ((SELECT id FROM public.brands WHERE name = 'AB Inflatables'), 'Oceanus 15', nautical_type_id, 2010, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;
END $$;
