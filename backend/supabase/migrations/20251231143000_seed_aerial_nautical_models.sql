-- Seed ampliado de marcas y modelos para Aéreo y Náutico.
-- Objetivo: que el wizard pueda filtrar Marca/Modelo por tipo sin quedar vacío,
-- y que el catálogo inicial sea lo más completo posible (sin duplicados).

DO $$
DECLARE
  aerial_type_id uuid;
  nautical_type_id uuid;
BEGIN
  SELECT id INTO aerial_type_id FROM public.vehicle_types WHERE slug = 'aereo' LIMIT 1;
  SELECT id INTO nautical_type_id FROM public.vehicle_types WHERE slug = 'nautico' LIMIT 1;

  -- Si por alguna razón no existen estos tipos, no hacemos nada.
  IF aerial_type_id IS NULL AND nautical_type_id IS NULL THEN
    RETURN;
  END IF;

  -- Marcas (si no existen)
  INSERT INTO public.brands (name, is_active) VALUES
    -- Aéreo (aviones/helicópteros/drones)
    ('Airbus', true),
    ('Boeing', true),
    ('Embraer', true),
    ('Bombardier', true),
    ('ATR', true),
    ('Dassault', true),
    ('Gulfstream', true),
    ('Learjet', true),
    ('Cessna', true),
    ('Beechcraft', true),
    ('Piper', true),
    ('Cirrus', true),
    ('Pilatus', true),
    ('Diamond Aircraft', true),
    ('Tecnam', true),
    ('Antonov', true),
    ('Ilyushin', true),
    ('Sukhoi', true),
    ('Yakolev', true),
    ('Airbus Helicopters', true),
    ('Bell Helicopter', true),
    ('Robinson Helicopter', true),
    ('Sikorsky', true),
    ('Leonardo Helicopters', true),
    ('DJI', true),
    ('Autel Robotics', true),
    ('Parrot', true),
    ('Skydio', true),
    -- Náutico (embarcaciones/motores/jet ski)
    ('Yamaha Marine', true),
    ('Mercury Marine', true),
    ('Suzuki Marine', true),
    ('Honda Marine', true),
    ('Volvo Penta', true),
    ('Evinrude', true),
    ('Sea-Doo', true),
    ('Kawasaki Jet Ski', true),
    ('Beneteau', true),
    ('Jeanneau', true),
    ('Lagoon', true),
    ('Bavaria', true),
    ('Catalina Yachts', true),
    ('Hanse', true),
    ('Sea Ray', true),
    ('Bayliner', true),
    ('Boston Whaler', true),
    ('Quicksilver', true),
    ('Zodiac', true),
    ('MasterCraft', true),
    ('Nautique', true),
    ('Princess Yachts', true),
    ('Sunseeker', true),
    ('Azimut', true),
    ('Ferretti', true)
  ON CONFLICT (name) DO NOTHING;

  -- Modelos Aéreos
  IF aerial_type_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
      ((SELECT id FROM public.brands WHERE name = 'Airbus'), 'A220', aerial_type_id, 2016, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Airbus'), 'A320', aerial_type_id, 1987, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Airbus'), 'A330', aerial_type_id, 1994, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Airbus'), 'A350', aerial_type_id, 2013, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Boeing'), '737', aerial_type_id, 1967, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Boeing'), '747', aerial_type_id, 1969, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Boeing'), '767', aerial_type_id, 1981, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Boeing'), '777', aerial_type_id, 1995, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Boeing'), '787', aerial_type_id, 2011, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Embraer'), 'E175', aerial_type_id, 2004, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Embraer'), 'E190', aerial_type_id, 2004, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Embraer'), 'Phenom 300', aerial_type_id, 2009, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Bombardier'), 'CRJ900', aerial_type_id, 2001, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Bombardier'), 'Challenger 350', aerial_type_id, 2014, NULL),
      ((SELECT id FROM public.brands WHERE name = 'ATR'), 'ATR 72', aerial_type_id, 1988, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Dassault'), 'Falcon 7X', aerial_type_id, 2007, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Gulfstream'), 'G650', aerial_type_id, 2012, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Cessna'), '172 Skyhawk', aerial_type_id, 1956, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Cessna'), 'Citation CJ4', aerial_type_id, 2010, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Beechcraft'), 'King Air 350', aerial_type_id, 1990, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Piper'), 'PA-28 Cherokee', aerial_type_id, 1960, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Cirrus'), 'SR22', aerial_type_id, 2001, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Pilatus'), 'PC-12', aerial_type_id, 1994, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Diamond Aircraft'), 'DA42', aerial_type_id, 2004, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Tecnam'), 'P2006T', aerial_type_id, 2009, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Antonov'), 'An-2', aerial_type_id, 1947, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Sukhoi'), 'Superjet 100', aerial_type_id, 2011, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Airbus Helicopters'), 'H125', aerial_type_id, 2005, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Airbus Helicopters'), 'H145', aerial_type_id, 2002, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Bell Helicopter'), '407', aerial_type_id, 1996, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Robinson Helicopter'), 'R44 Raven', aerial_type_id, 1992, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Sikorsky'), 'S-76', aerial_type_id, 1977, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Leonardo Helicopters'), 'AW109', aerial_type_id, 1976, NULL),
      ((SELECT id FROM public.brands WHERE name = 'DJI'), 'Mavic 3', aerial_type_id, 2021, NULL),
      ((SELECT id FROM public.brands WHERE name = 'DJI'), 'Mini 4 Pro', aerial_type_id, 2023, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Autel Robotics'), 'EVO II', aerial_type_id, 2020, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Parrot'), 'ANAFI', aerial_type_id, 2018, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Skydio'), 'Skydio 2+', aerial_type_id, 2021, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Modelos Náuticos
  IF nautical_type_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
      ((SELECT id FROM public.brands WHERE name = 'Yamaha Marine'), '242X E-Series', nautical_type_id, 2015, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Yamaha Marine'), 'AR190', nautical_type_id, 2010, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Mercury Marine'), 'FourStroke 150', nautical_type_id, 2001, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Mercury Marine'), 'Verado 300', nautical_type_id, 2006, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Suzuki Marine'), 'DF150', nautical_type_id, 2003, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Honda Marine'), 'BF150', nautical_type_id, 2002, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Volvo Penta'), 'D4', nautical_type_id, 2005, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Evinrude'), 'E-TEC 200', nautical_type_id, 2004, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Sea-Doo'), 'Spark', nautical_type_id, 2014, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Sea-Doo'), 'GTX Limited', nautical_type_id, 1998, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Sea-Doo'), 'RXP-X', nautical_type_id, 2008, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Kawasaki Jet Ski'), 'Ultra 310LX', nautical_type_id, 2014, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Beneteau'), 'Oceanis 46.1', nautical_type_id, 2018, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Beneteau'), 'Antares 8', nautical_type_id, 2016, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Jeanneau'), 'Sun Odyssey 349', nautical_type_id, 2014, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Jeanneau'), 'Merry Fisher 795', nautical_type_id, 2017, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Lagoon'), 'Lagoon 42', nautical_type_id, 2016, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Bavaria'), 'Cruiser 37', nautical_type_id, 2013, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Catalina Yachts'), 'Catalina 30', nautical_type_id, 1976, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Hanse'), 'Hanse 388', nautical_type_id, 2019, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Sea Ray'), 'SPX 190', nautical_type_id, 2015, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Sea Ray'), 'Sundancer 320', nautical_type_id, 2003, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Bayliner'), 'Element E16', nautical_type_id, 2013, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Boston Whaler'), '170 Montauk', nautical_type_id, 1973, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Quicksilver'), 'Activ 605', nautical_type_id, 2013, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Zodiac'), 'Cadet 340', nautical_type_id, 2000, NULL),
      ((SELECT id FROM public.brands WHERE name = 'MasterCraft'), 'XStar', nautical_type_id, 2006, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Nautique'), 'Super Air Nautique G23', nautical_type_id, 2013, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Princess Yachts'), 'Princess V50', nautical_type_id, 1999, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Sunseeker'), 'Manhattan 55', nautical_type_id, 2008, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Azimut'), 'Azimut 55', nautical_type_id, 2010, NULL),
      ((SELECT id FROM public.brands WHERE name = 'Ferretti'), 'Ferretti 550', nautical_type_id, 2016, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;
END $$;
