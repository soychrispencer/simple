-- =====================================================================
-- BASELINE (SQUASH) - SIMPLE ECOSYSTEM
-- AUTOGENERADO. NO EDITAR A MANO.
--
-- IMPORTANTE:
-- - Pensado para bases NUEVAS/VACÍAS (o entornos que se van a resetear).
-- - No aplicar sobre un remoto existente con historial de migraciones previo.
-- =====================================================================
-- AUTOGENERADO. NO EDITAR A MANO.
-- Generado por: node scripts/supabase-consolidate-migrations.mjs
-- Fecha: 2026-01-13T02:43:45.735Z

-- =====================================================================
-- Source migration: 20251114000001_seed_data_complete.sql
-- =====================================================================
-- ===========================================
-- SEED DATA COMPLETO PARA SIMPLE MARKETPLACE
-- Datos iniciales: Regiones, Comunas, Tipos de Vehículos, Marcas por Tipo, Modelos
-- Fecha: 14 de noviembre de 2025
-- Proyecto: kfxkjoqopooyddglygmf
-- ===========================================

/*
============================
 SEED DATA - DATOS INICIALES
============================
*/

-- Insertar verticales
INSERT INTO public.verticals (name, key, description, is_active) VALUES
    ('Vehículos', 'vehicles', 'Compra y venta de vehículos', true),
    ('Propiedades', 'properties', 'Compra y venta de propiedades', true),
    ('Tiendas', 'stores', 'Retail físico y e-commerce', true),
    ('Food', 'food', 'Restaurantes y delivery', true)
ON CONFLICT (key) DO NOTHING;

-- Slots predeterminados por vertical
WITH slot_defs AS (
    SELECT * FROM (
        VALUES
            ('vehicles','home_main','Home principal','Carrusel destacado en home','home',8,15,25000,'{"listing_types":["sale","rent","auction"]}'::jsonb),
            ('vehicles','venta_tab','Listado Venta','Bloque destacado pestaña Venta','search_tab',6,15,18000,'{"listing_types":["sale"]}'::jsonb),
            ('vehicles','arriendo_tab','Listado Arriendo','Bloque destacado pestaña Arriendo','search_tab',6,15,18000,'{"listing_types":["rent"]}'::jsonb),
            ('vehicles','subasta_tab','Listado Subasta','Bloque destacado pestaña Subasta','search_tab',4,7,15000,'{"listing_types":["auction"]}'::jsonb),
            ('vehicles','user_page','Perfil vendedor','Slider destacado en perfil','profile',10,30,0,'{"listing_types":[]}'::jsonb),
            ('properties','featured_grid','Propiedades destacadas','Grid premium en home','home',12,30,20000,'{"listing_types":["sale","rent"]}'::jsonb),
            ('properties','premium_banner','Banner premium','Hero destacado en resultados','search_tab',3,30,30000,'{"listing_types":["sale"]}'::jsonb),
            ('stores','home_showcase','Escaparate tiendas','Carrusel en home','home',10,30,22000,'{"listing_types":[]}'::jsonb),
            ('stores','category_banner','Banner categoría','Destacado en categoría','category',6,30,18000,'{"listing_types":[]}'::jsonb),
            ('food','home_carousel','Carousel restaurantes','Home delivery','home',10,14,15000,'{"listing_types":[]}'::jsonb),
            ('food','express_pick','Express Pick','Sección recomendada','home',5,7,12000,'{"listing_types":[]}'::jsonb)
    ) AS t(vertical_key, slot_key, title, description, placement, max_active, duration_days, price, cfg)
)
INSERT INTO public.boost_slots (vertical_id, key, title, description, placement, max_active, default_duration_days, price, config)
SELECT v.id, s.slot_key, s.title, s.description, s.placement, s.max_active, s.duration_days, s.price, s.cfg
FROM slot_defs s
JOIN public.verticals v ON v.key = s.vertical_key
ON CONFLICT (vertical_id, key) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    placement = EXCLUDED.placement,
    max_active = EXCLUDED.max_active,
    default_duration_days = EXCLUDED.default_duration_days,
    price = EXCLUDED.price,
    config = EXCLUDED.config;

INSERT INTO public.vehicle_types (name, slug, category) VALUES
    -- La columna category define la *agrupación base* usada por el wizard.
    -- Los slugs pueden mantenerse (compat/SEO), pero la categoría es la llave estable.
    ('Auto', 'auto', 'car'),
    ('Moto', 'moto', 'motorcycle'),
    ('Camión', 'camion', 'truck'),
    ('Bus', 'bus', 'bus'),
    ('Maquinaria', 'maquinaria', 'machinery'),
    ('Náutico', 'nautico', 'nautical'),
    ('Aéreo', 'aereo', 'aerial')
ON CONFLICT (slug) DO NOTHING;

-- Insertar marcas agrupadas por tipo de vehículo

-- Marcas de autos
INSERT INTO public.brands (name, is_active) VALUES
    ('Toyota', true),
    ('Honda', true),
    ('Nissan', true),
    ('Mitsubishi', true),
    ('Mazda', true),
    ('Subaru', true),
    ('Lexus', true),
    ('Infiniti', true),
    ('Chevrolet', true),
    ('Ford', true),
    ('Chrysler', true),
    ('Dodge', true),
    ('Jeep', true),
    ('GMC', true),
    ('Ram', true),
    ('Lincoln', true),
    ('Cadillac', true),
    ('Buick', true),
    ('Acura', true),
    ('BMW', true),
    ('Mercedes-Benz', true),
    ('Audi', true),
    ('Volkswagen', true),
    ('Porsche', true),
    ('Opel', true),
    ('Smart', true),
    ('Volvo', true),
    ('Saab', true),
    ('Polestar', true),
    ('Peugeot', true),
    ('Renault', true),
    ('Citroën', true),
    ('DS Automobiles', true),
    ('Bugatti', true),
    ('Alpine', true),
    ('Fiat', true),
    ('Ferrari', true),
    ('Lamborghini', true),
    ('Alfa Romeo', true),
    ('Maserati', true),
    ('Lancia', true),
    ('Abarth', true),
    ('Pagani', true),
    ('Kia', true),
    ('Hyundai', true),
    ('Genesis', true),
    ('SsangYong', true),
    ('Daewoo', true),
    ('Chery', true),
    ('Geely', true),
    ('BYD', true),
    ('JAC', true),
    ('Great Wall', true),
    ('Haval', true),
    ('Changan', true),
    ('Dongfeng', true),
    ('Foton', true),
    ('Zotye', true),
    ('Wuling', true),
    ('BAIC', true),
    ('NIO', true),
    ('Xpeng', true),
    ('Li Auto', true),
    ('Leapmotor', true),
    ('Land Rover', true),
    ('Jaguar', true),
    ('Mini', true),
    ('Bentley', true),
    ('Rolls-Royce', true),
    ('Aston Martin', true),
    ('Brilliance', true),
    ('DFSK', true),
    ('Faw', true),
    ('GAC Motor', true),
    ('Jetour', true),
    ('Lifan', true),
    ('Mahindra', true),
    ('MG', true),
    ('Morris', true),
    ('Triumph', true),
    ('Lotus', true),
    ('McLaren', true),
    ('Caterham', true),
    ('Ariel', true),
    ('BAC', true),
    ('Caparo', true),
    ('Ginetta', true),
    ('Radical', true),
    ('Westfield', true),
    ('Noble', true),
    ('Ultima', true),
    ('Ascari', true),
    ('Maxus', true),
    ('Tesla', true),
    ('Rivian', true),
    ('Lucid', true),
    ('Faraday Future', true),
    ('Fisker', true),
    ('Aptera', true),
    ('Bollinger', true),
    ('Lordstown', true),
    ('Canoo', true),
    ('Nikola', true),
    ('Workhorse', true),
    ('Proterra', true),
    ('SEAT', true),
    ('Skoda', true),
    ('DR Motor', true),
    ('Tatra', true),
    ('Avia', true),
    ('Praga', true),
    ('Cupra', true),
    ('Hispano-Suiza', true),
    ('Pininfarina', true),
    ('Scion', true),
    ('Saturn', true),
    ('Pontiac', true),
    ('Oldsmobile', true),
    ('Mercury', true),
    ('Plymouth', true),
    ('Eagle', true),
    ('Geo', true),
    ('Hummer', true),
    ('Suzuki', true),
    ('Koenigsegg', true),
    ('Datsun', true),
    ('Isuzu', true),
    ('Daihatsu', true),
    ('Hino', true)
ON CONFLICT (name) DO NOTHING;

-- Marcas de motos
INSERT INTO public.brands (name, is_active) VALUES
    ('Honda Motorcycle', true),
    ('Benelli', true),
    ('Yamaha', true),
    ('Kawasaki', true),
    ('Suzuki Motorcycle', true),
    ('Harley-Davidson', true),
    ('Indian Motorcycle', true),
    ('Victory', true),
    ('Ducati', true),
    ('Aprilia', true),
    ('Moto Guzzi', true),
    ('Piaggio', true),
    ('Vespa', true),
    ('KTM', true),
    ('Husqvarna', true),
    ('BMW Motorrad', true),
    ('Triumph Motorcycles', true),
    ('Norton', true),
    ('BSA', true),
    ('Royal Enfield', true),
    ('Jawa', true),
    ('ČZ', true),
    ('JAWA Moto', true),
    ('Bajaj Pulsar', true),
    ('LML', true),
    ('Escorts Group', true),
    ('Mahindra Two Wheelers', true),
    ('Atul Auto', true),
    ('Greaves Cotton', true),
    ('Kinetic Engineering', true),
    ('Lohia Machinery', true),
    ('Bajaj Auto', true),
    ('TVS Motor', true),
    ('Hero MotoCorp', true),
    ('CFMoto', true)
ON CONFLICT (name) DO NOTHING;

-- Marcas de camiones
INSERT INTO public.brands (name, is_active) VALUES
    ('Mercedes-Benz Trucks', true),
    ('Volvo Trucks', true),
    ('MAN', true),
    ('DAF', true),
    ('Iveco', true),
    ('Renault Trucks', true),
    ('Scania', true),
    ('Nissan Diesel', true),
    ('Mitsubishi Fuso', true),
    ('UD Trucks', true),
    ('Tata Motors', true),
    ('Ashok Leyland', true),
    ('BharatBenz', true),
    ('VE Commercial Vehicles', true),
    ('SML Isuzu', true),
    ('Force Motors', true),
    ('Eicher Motors', true),
    ('Hindustan Motors', true),
    ('Premier Automobiles', true),
    ('Sipani', true),
    ('Swami Vivekananda Automobiles', true),
    ('Blue Bird', true),
    ('Thomas Built', true),
    ('Prevost', true),
    ('Nova Bus', true),
    ('Western Star', true),
    ('Peterbilt', true),
    ('Kenworth', true),
    ('Mack', true),
    ('Freightliner', true),
    ('International', true)
ON CONFLICT (name) DO NOTHING;

-- Marcas de buses
INSERT INTO public.brands (name, is_active) VALUES
    ('Mercedes-Benz Buses', true),
    ('Volvo Buses', true),
    ('MAN Buses', true),
    ('Scania Buses', true),
    ('Iveco Bus', true),
    ('Solaris', true),
    ('VDL', true),
    ('Irizar', true),
    ('Marcopolo', true),
    ('Comil', true),
    ('Busscar', true),
    ('Caio', true),
    ('Neobus', true),
    ('Agrale', true),
    ('Maserati Bus', true),
    ('Setra', true),
    ('Neoplan', true),
    ('Van Hool', true),
    ('Prevost Buses', true),
    ('Beulas', true),
    ('King Long', true),
    ('Yutong', true)
ON CONFLICT (name) DO NOTHING;

-- Marcas de vehículos industriales
INSERT INTO public.brands (name, is_active) VALUES
    ('Caterpillar', true),
    ('John Deere', true),
    ('Komatsu', true),
    ('Volvo Construction', true),
    ('JCB', true),
    ('Case IH', true),
    ('New Holland', true),
    ('Bobcat', true),
    ('Doosan', true),
    ('Hyundai Construction', true),
    ('Hitachi', true),
    ('Liebherr', true),
    ('Terex', true),
    ('CNH Maquinaria', true),
    ('AGCO', true),
    ('Kubota', true),
    ('Fendt', true),
    ('Deutz-Fahr', true),
    ('Massey Ferguson', true),
    ('Valtra', true)
ON CONFLICT (name) DO NOTHING;

-- Marcas de vehículos comerciales
INSERT INTO public.brands (name, is_active) VALUES
    ('Mercedes-Benz Vans', true),
    ('Volkswagen Crafter', true),
    ('Iveco Daily', true),
    ('Ford Transit', true),
    ('Fiat Ducato', true),
    ('Citroën Jumper', true),
    ('Peugeot Boxer', true),
    ('Opel Movano', true),
    ('Renault Master', true),
    ('Nissan NV', true),
    ('Toyota Hiace', true),
    ('Hyundai H1', true),
    ('Kia Carnival', true),
    ('La Campagnola', true),
    ('La Mesa', true),
    ('Beccar', true),
    ('Caravan', true),
    ('Monaco', true),
    ('Prevost Marathons', true),
    ('American Heritage', true),
    ('JMC', true)
ON CONFLICT (name) DO NOTHING;
 
INSERT INTO public.regions (name, code) VALUES
    ('Arica y Parinacota', 'arica-parinacota'),
    ('Tarapacá', 'tarapaca'),
    ('Antofagasta', 'antofagasta'),
    ('Atacama', 'atacama'),
    ('Coquimbo', 'coquimbo'),
    ('Valparaíso', 'valparaiso'),
    ('Metropolitana de Santiago', 'metropolitana-de-santiago'),
    ('Libertador General Bernardo O''Higgins', 'libertador-general-bernardo-ohiggins'),
    ('Maule', 'maule'),
    ('Ñuble', 'nuble'),
    ('Biobío', 'biobio'),
    ('Araucanía', 'araucania'),
    ('Los Ríos', 'los-rios'),
    ('Los Lagos', 'los-lagos'),
    ('Aysén', 'aysen'),
    ('Magallanes', 'magallanes')
ON CONFLICT (name) DO NOTHING;

-- Insertar comunas por región
DO $$
DECLARE
    -- Variables para IDs de regiones
    arica_id UUID; tarapaca_id UUID; antofagasta_id UUID; atacama_id UUID;
    coquimbo_id UUID; valpo_id UUID; metro_id UUID; ohiggins_id UUID;
    maule_id UUID; nubla_id UUID; biobio_id UUID; araucania_id UUID;
    losrios_id UUID; loslagos_id UUID; aysen_id UUID; magallanes_id UUID;
BEGIN
    -- Obtener IDs de todas las regiones
    SELECT id INTO arica_id FROM public.regions WHERE name = 'Arica y Parinacota' LIMIT 1;
    SELECT id INTO tarapaca_id FROM public.regions WHERE name = 'Tarapacá' LIMIT 1;
    SELECT id INTO antofagasta_id FROM public.regions WHERE name = 'Antofagasta' LIMIT 1;
    SELECT id INTO atacama_id FROM public.regions WHERE name = 'Atacama' LIMIT 1;
    SELECT id INTO coquimbo_id FROM public.regions WHERE name = 'Coquimbo' LIMIT 1;
    SELECT id INTO valpo_id FROM public.regions WHERE name = 'Valparaíso' LIMIT 1;
    SELECT id INTO metro_id FROM public.regions WHERE name = 'Metropolitana de Santiago' LIMIT 1;
    SELECT id INTO ohiggins_id FROM public.regions WHERE name = 'Libertador General Bernardo O''Higgins' LIMIT 1;
    SELECT id INTO maule_id FROM public.regions WHERE name = 'Maule' LIMIT 1;
    SELECT id INTO nubla_id FROM public.regions WHERE name = 'Ñuble' LIMIT 1;
    SELECT id INTO biobio_id FROM public.regions WHERE name = 'Biobío' LIMIT 1;
    SELECT id INTO araucania_id FROM public.regions WHERE name = 'Araucanía' LIMIT 1;
    SELECT id INTO losrios_id FROM public.regions WHERE name = 'Los Ríos' LIMIT 1;
    SELECT id INTO loslagos_id FROM public.regions WHERE name = 'Los Lagos' LIMIT 1;
    SELECT id INTO aysen_id FROM public.regions WHERE name = 'Aysén' LIMIT 1;
    SELECT id INTO magallanes_id FROM public.regions WHERE name = 'Magallanes' LIMIT 1;

    -- Insertar comunas para cada región
    -- Arica y Parinacota
    INSERT INTO public.communes (name, region_id) VALUES
    ('Arica', arica_id), ('Camarones', arica_id), ('Putre', arica_id), ('General Lagos', arica_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Tarapacá
    INSERT INTO public.communes (name, region_id) VALUES
    ('Iquique', tarapaca_id), ('Alto Hospicio', tarapaca_id), ('Pozo Almonte', tarapaca_id),
    ('Camiña', tarapaca_id), ('Colchane', tarapaca_id), ('Huara', tarapaca_id), ('Pica', tarapaca_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Antofagasta
    INSERT INTO public.communes (name, region_id) VALUES
    ('Antofagasta', antofagasta_id), ('Mejillones', antofagasta_id), ('Sierra Gorda', antofagasta_id),
    ('Taltal', antofagasta_id), ('Calama', antofagasta_id), ('Ollagüe', antofagasta_id),
    ('San Pedro de Atacama', antofagasta_id), ('Tocopilla', antofagasta_id), ('María Elena', antofagasta_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Atacama
    INSERT INTO public.communes (name, region_id) VALUES
    ('Copiapó', atacama_id), ('Caldera', atacama_id), ('Tierra Amarilla', atacama_id),
    ('Chañaral', atacama_id), ('Diego de Almagro', atacama_id), ('Vallenar', atacama_id),
    ('Alto del Carmen', atacama_id), ('Freirina', atacama_id), ('Huasco', atacama_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Coquimbo
    INSERT INTO public.communes (name, region_id) VALUES
    ('La Serena', coquimbo_id), ('Coquimbo', coquimbo_id), ('Andacollo', coquimbo_id),
    ('La Higuera', coquimbo_id), ('Paiguano', coquimbo_id), ('Vicuña', coquimbo_id),
    ('Illapel', coquimbo_id), ('Canela', coquimbo_id), ('Los Vilos', coquimbo_id),
    ('Salamanca', coquimbo_id), ('Ovalle', coquimbo_id), ('Combarbalá', coquimbo_id),
    ('Monte Patria', coquimbo_id), ('Punitaqui', coquimbo_id), ('Río Hurtado', coquimbo_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Valparaíso
    INSERT INTO public.communes (name, region_id) VALUES
    ('Valparaíso', valpo_id), ('Viña del Mar', valpo_id), ('Concón', valpo_id),
    ('Quintero', valpo_id), ('Puchuncaví', valpo_id), ('Quilpué', valpo_id),
    ('Villa Alemana', valpo_id), ('Limache', valpo_id), ('Olmué', valpo_id),
    ('Los Andes', valpo_id), ('Calle Larga', valpo_id), ('Rinconada', valpo_id),
    ('San Esteban', valpo_id), ('Catemu', valpo_id), ('Llay-Llay', valpo_id),
    ('Panquehue', valpo_id), ('Putaendo', valpo_id), ('San Felipe', valpo_id),
    ('Santa María', valpo_id), ('La Ligua', valpo_id), ('Cabildo', valpo_id),
    ('Papudo', valpo_id), ('Petorca', valpo_id), ('Zapallar', valpo_id),
    ('Hijuelas', valpo_id), ('La Calera', valpo_id), ('La Cruz', valpo_id),
    ('Nogales', valpo_id), ('Quillota', valpo_id), ('San Antonio', valpo_id), ('Algarrobo', valpo_id),
    ('Cartagena', valpo_id), ('El Quisco', valpo_id), ('El Tabo', valpo_id),
    ('Santo Domingo', valpo_id), ('Casablanca', valpo_id), ('Juan Fernández', valpo_id),
    ('Isla de Pascua', valpo_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Metropolitana de Santiago
    INSERT INTO public.communes (name, region_id) VALUES
    ('Santiago', metro_id), ('Cerrillos', metro_id), ('Cerro Navia', metro_id),
    ('Conchalí', metro_id), ('El Bosque', metro_id), ('Estación Central', metro_id),
    ('Huechuraba', metro_id), ('Independencia', metro_id), ('La Cisterna', metro_id),
    ('La Florida', metro_id), ('La Granja', metro_id), ('La Pintana', metro_id),
    ('La Reina', metro_id), ('Las Condes', metro_id), ('Lo Barnechea', metro_id),
    ('Lo Espejo', metro_id), ('Lo Prado', metro_id), ('Macul', metro_id),
    ('Maipú', metro_id), ('Ñuñoa', metro_id), ('Pedro Aguirre Cerda', metro_id),
    ('Peñalolén', metro_id), ('Providencia', metro_id), ('Pudahuel', metro_id),
    ('Quilicura', metro_id), ('Quinta Normal', metro_id), ('Recoleta', metro_id),
    ('Renca', metro_id), ('San Joaquín', metro_id), ('San Miguel', metro_id),
    ('San Ramón', metro_id), ('Vitacura', metro_id), ('Puente Alto', metro_id),
    ('Pirque', metro_id), ('San José de Maipo', metro_id), ('Colina', metro_id),
    ('Lampa', metro_id), ('Tiltil', metro_id), ('San Bernardo', metro_id),
    ('Buin', metro_id), ('Calera de Tango', metro_id), ('Paine', metro_id),
    ('Melipilla', metro_id), ('Alhué', metro_id), ('Curacaví', metro_id),
    ('María Pinto', metro_id), ('San Pedro', metro_id), ('Talagante', metro_id),
    ('El Monte', metro_id), ('Isla de Maipo', metro_id), ('Padre Hurtado', metro_id),
    ('Peñaflor', metro_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- O'Higgins
    INSERT INTO public.communes (name, region_id) VALUES
    ('Rancagua', ohiggins_id), ('Codegua', ohiggins_id), ('Coinco', ohiggins_id),
    ('Coltauco', ohiggins_id), ('Doñihue', ohiggins_id), ('Graneros', ohiggins_id),
    ('Las Cabras', ohiggins_id), ('Machalí', ohiggins_id), ('Malloa', ohiggins_id),
    ('Mostazal', ohiggins_id), ('Olivar', ohiggins_id), ('Peumo', ohiggins_id),
    ('Pichidegua', ohiggins_id), ('Quinta de Tilcoco', ohiggins_id), ('Rengo', ohiggins_id),
    ('Requínoa', ohiggins_id), ('San Vicente', ohiggins_id), ('Pichilemu', ohiggins_id),
    ('La Estrella', ohiggins_id), ('Litueche', ohiggins_id), ('Marchihue', ohiggins_id),
    ('Navidad', ohiggins_id), ('Paredones', ohiggins_id), ('San Fernando', ohiggins_id),
    ('Chépica', ohiggins_id), ('Chimbarongo', ohiggins_id), ('Lolol', ohiggins_id),
    ('Nancagua', ohiggins_id), ('Palmilla', ohiggins_id), ('Peralillo', ohiggins_id),
    ('Placilla', ohiggins_id), ('Pumanque', ohiggins_id), ('Santa Cruz', ohiggins_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Maule
    INSERT INTO public.communes (name, region_id) VALUES
    ('Talca', maule_id), ('Constitución', maule_id), ('Curepto', maule_id),
    ('Empedrado', maule_id), ('Maule', maule_id), ('Pelarco', maule_id),
    ('Pencahue', maule_id), ('Río Claro', maule_id), ('San Clemente', maule_id),
    ('San Rafael', maule_id), ('Cauquenes', maule_id), ('Chanco', maule_id),
    ('Pelluhue', maule_id), ('Curicó', maule_id), ('Hualañé', maule_id),
    ('Licantén', maule_id), ('Molina', maule_id), ('Rauco', maule_id),
    ('Romeral', maule_id), ('Sagrada Familia', maule_id), ('Teno', maule_id),
    ('Vichuquén', maule_id), ('Linares', maule_id), ('Colbún', maule_id),
    ('Longaví', maule_id), ('Parral', maule_id), ('Retiro', maule_id),
    ('San Javier', maule_id), ('Villa Alegre', maule_id), ('Yerbas Buenas', maule_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Ñuble
    INSERT INTO public.communes (name, region_id) VALUES
    ('Chillán', nubla_id), ('Bulnes', nubla_id), ('Chillán Viejo', nubla_id),
    ('El Carmen', nubla_id), ('Pemuco', nubla_id), ('Pinto', nubla_id),
    ('Quillón', nubla_id), ('San Ignacio', nubla_id), ('Yungay', nubla_id),
    ('Coelemu', nubla_id), ('Coihueco', nubla_id), ('Ninhue', nubla_id),
    ('Portezuelo', nubla_id), ('Quirihue', nubla_id), ('Ránquil', nubla_id),
    ('Treguaco', nubla_id), ('Cobquecura', nubla_id), ('Niquen', nubla_id),
    ('San Carlos', nubla_id), ('San Fabián', nubla_id), ('San Nicolás', nubla_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Biobío
    INSERT INTO public.communes (name, region_id) VALUES
    ('Concepción', biobio_id), ('Coronel', biobio_id), ('Chiguayante', biobio_id),
    ('Florida', biobio_id), ('Hualqui', biobio_id), ('Lota', biobio_id),
    ('Penco', biobio_id), ('San Pedro de la Paz', biobio_id), ('Santa Juana', biobio_id),
    ('Talcahuano', biobio_id), ('Tomé', biobio_id), ('Hualpén', biobio_id),
    ('Lebu', biobio_id), ('Arauco', biobio_id), ('Cañete', biobio_id),
    ('Contulmo', biobio_id), ('Curanilahue', biobio_id), ('Los Álamos', biobio_id),
    ('Tirúa', biobio_id), ('Los Ángeles', biobio_id), ('Antuco', biobio_id),
    ('Cabrero', biobio_id), ('Laja', biobio_id), ('Mulchén', biobio_id),
    ('Nacimiento', biobio_id), ('Negrete', biobio_id), ('Quilaco', biobio_id),
    ('Quilleco', biobio_id), ('San Rosendo', biobio_id), ('Santa Bárbara', biobio_id),
    ('Tucapel', biobio_id), ('Yumbel', biobio_id), ('Alto Biobío', biobio_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Araucanía
    INSERT INTO public.communes (name, region_id) VALUES
    ('Temuco', araucania_id), ('Carahue', araucania_id), ('Cunco', araucania_id),
    ('Curarrehue', araucania_id), ('Freire', araucania_id), ('Galvarino', araucania_id),
    ('Gorbea', araucania_id), ('Lautaro', araucania_id), ('Loncoche', araucania_id),
    ('Melipeuco', araucania_id), ('Nueva Imperial', araucania_id), ('Padre las Casas', araucania_id),
    ('Perquenco', araucania_id), ('Pitrufquén', araucania_id), ('Pucón', araucania_id),
    ('Saavedra', araucania_id), ('Teodoro Schmidt', araucania_id), ('Toltén', araucania_id),
    ('Vilcún', araucania_id), ('Villarrica', araucania_id), ('Cholchol', araucania_id),
    ('Angol', araucania_id), ('Collipulli', araucania_id), ('Curacautín', araucania_id),
    ('Ercilla', araucania_id), ('Lonquimay', araucania_id), ('Los Sauces', araucania_id),
    ('Lumaco', araucania_id), ('Purén', araucania_id), ('Renaico', araucania_id),
    ('Traiguén', araucania_id), ('Victoria', araucania_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Los Ríos
    INSERT INTO public.communes (name, region_id) VALUES
    ('Valdivia', losrios_id), ('Corral', losrios_id), ('Lanco', losrios_id),
    ('Los Lagos', losrios_id), ('Máfil', losrios_id), ('Mariquina', losrios_id),
    ('Paillaco', losrios_id), ('Panguipulli', losrios_id), ('La Unión', losrios_id),
    ('Futrono', losrios_id), ('Lago Ranco', losrios_id), ('Río Bueno', losrios_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Los Lagos
    INSERT INTO public.communes (name, region_id) VALUES
    ('Puerto Montt', loslagos_id), ('Calbuco', loslagos_id), ('Cochamó', loslagos_id),
    ('Fresia', loslagos_id), ('Frutillar', loslagos_id), ('Los Muermos', loslagos_id),
    ('Llanquihue', loslagos_id), ('Maullín', loslagos_id), ('Puerto Varas', loslagos_id),
    ('Castro', loslagos_id), ('Ancud', loslagos_id), ('Chonchi', loslagos_id),
    ('Curaco de Vélez', loslagos_id), ('Dalcahue', loslagos_id), ('Puqueldón', loslagos_id),
    ('Queilén', loslagos_id), ('Quellón', loslagos_id), ('Quemchi', loslagos_id),
    ('Quinchao', loslagos_id), ('Osorno', loslagos_id), ('Puerto Octay', loslagos_id),
    ('Purranque', loslagos_id), ('Puyehue', loslagos_id), ('Río Negro', loslagos_id),
    ('San Juan de la Costa', loslagos_id), ('San Pablo', loslagos_id), ('Chaitén', loslagos_id),
    ('Futaleufú', loslagos_id), ('Hualaihué', loslagos_id), ('Palena', loslagos_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Aysén
    INSERT INTO public.communes (name, region_id) VALUES
    ('Coyhaique', aysen_id), ('Lago Verde', aysen_id), ('Aysén', aysen_id),
    ('Cisnes', aysen_id), ('Guaitecas', aysen_id), ('Cochrane', aysen_id),
    ('O''Higgins', aysen_id), ('Tortel', aysen_id), ('Chile Chico', aysen_id),
    ('Río Ibáñez', aysen_id)
    ON CONFLICT (name, region_id) DO NOTHING;

    -- Magallanes
    INSERT INTO public.communes (name, region_id) VALUES
    ('Punta Arenas', magallanes_id), ('Laguna Blanca', magallanes_id), ('Río Verde', magallanes_id),
    ('San Gregorio', magallanes_id), ('Cabo de Hornos', magallanes_id), ('Antártica', magallanes_id),
    ('Porvenir', magallanes_id), ('Primavera', magallanes_id), ('Timaukel', magallanes_id),
    ('Natales', magallanes_id), ('Torres del Paine', magallanes_id)
    ON CONFLICT (name, region_id) DO NOTHING;

END $$;

-- Insertar marcas de vehículos principales

-- ===========================================
-- MODELOS POR TIPO DE VEHÍCULO
-- ===========================================

DO $$
BEGIN
    -- Autos
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
        ((SELECT id FROM public.brands WHERE name = 'Acura'), 'ILX', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Acura'), 'TLX', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Audi'), 'A3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1996, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Audi'), 'A4', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1994, NULL),
        ((SELECT id FROM public.brands WHERE name = 'BMW'), 'i3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'BMW'), 'Serie 3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1975, NULL),
        ((SELECT id FROM public.brands WHERE name = 'BMW'), 'Serie 5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1972, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Brilliance'), 'H230', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Brilliance'), 'H320', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Brilliance'), 'H530', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'BYD'), 'Dolphin', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'BYD'), 'Han', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'BYD'), 'Seal', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2022, NULL),
        ((SELECT id FROM public.brands WHERE name = 'BYD'), 'Yuan', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Changan'), 'Alsvin', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chery'), 'Arrizo 5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chery'), 'Arrizo 6', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Aveo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Cruze', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2008, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Malibu', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1964, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Onix', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Sail', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Citroën'), 'C-Elysée', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Citroën'), 'C3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Citroën'), 'C4', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2004, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Cupra'), 'Born', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Cupra'), 'León', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), '500', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Argo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Cronos', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Mobi', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Panda', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1980, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Tipo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1988, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'Fiesta', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1976, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'Focus', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1998, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'Mustang', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1964, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Geely'), 'Emgrand', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2009, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Great Wall'), 'Voleex C30', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'Accord', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1976, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'City', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1981, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'Civic', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1972, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'e', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'Fit', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2001, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'Insight', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Accent', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1994, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Elantra', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1990, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'HB20', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'HB20S', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'i30', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Ioniq 6', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2022, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Sonata', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1985, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Infiniti'), 'Q50', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Cerato', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2003, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Forte', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2008, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Picanto', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2003, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Rio', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2000, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Stinger', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Lexus'), 'ES', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1989, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Lexus'), 'IS', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Lifan'), '520', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Lifan'), '620', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2008, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mahindra'), 'KUV100', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mazda'), 'Mazda3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2003, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mazda'), 'Mazda6', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mazda'), 'MX-5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1989, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz'), 'Clase C', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1993, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz'), 'Clase E', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MG'), 'MG 3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2011, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MG'), 'MG 5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MG'), 'MG 6', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MG'), 'MG GT', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mini'), 'Cooper', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1961, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mitsubishi'), 'Mirage', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1978, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'Altima', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1992, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'Leaf', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'March', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1982, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'Sentra', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1982, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'Versa', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Opel'), 'Corsa', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1982, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), '208', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), '301', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), '408', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Polestar'), '2', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Porsche'), '911', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1963, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Porsche'), 'Panamera', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2009, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Porsche'), 'Taycan', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Clio', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1990, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Kwid', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Logan', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2004, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Megane', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Sandero', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Symbol', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'SEAT'), 'Ibiza', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1984, NULL),
        ((SELECT id FROM public.brands WHERE name = 'SEAT'), 'León', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'SEAT'), 'Toledo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1991, 2019),
        ((SELECT id FROM public.brands WHERE name = 'Skoda'), 'Fabia', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Skoda'), 'Octavia', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1996, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Skoda'), 'Superb', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2001, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Subaru'), 'BRZ', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Subaru'), 'Impreza', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1992, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Subaru'), 'Legacy', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1989, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Subaru'), 'Outback', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1994, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Subaru'), 'WRX', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1992, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki'), 'Alto', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1979, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki'), 'Baleno', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki'), 'Celerio', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2008, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki'), 'Dzire', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2008, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki'), 'Swift', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1983, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Tata Motors'), 'Tiago', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Tata Motors'), 'Tigor', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Tesla'), 'Model 3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Tesla'), 'Model S', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Avalon', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1994, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Camry', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1982, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Corolla', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1966, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Etios', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Prius', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1997, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Yaris', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Arteon', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Gol', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1980, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Golf', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1974, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'ID.3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Jetta', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1979, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Passat', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1973, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Polo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1975, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Virtus', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Voyage', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1981, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo'), 'S60', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2000, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo'), 'V60', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- SUVs (carrocería dentro de Autos)
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
        ((SELECT id FROM public.brands WHERE name = 'Audi'), 'e-tron', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Audi'), 'Q5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2008, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Audi'), 'Q7', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'BMW'), 'X3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2003, NULL),
        ((SELECT id FROM public.brands WHERE name = 'BMW'), 'X5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Brilliance'), 'V5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2011, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Brilliance'), 'V6', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Buick'), 'Encore', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'BYD'), 'Atto 3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'BYD'), 'Song', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'BYD'), 'Tang', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Changan'), 'CS15', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Changan'), 'CS35 Plus', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Changan'), 'CS55 Plus', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Changan'), 'CS75 Plus', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Changan'), 'UNI-K', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Changan'), 'UNI-T', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Changan'), 'X7 Plus', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chery'), 'Omoda 5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2022, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chery'), 'Tiggo 2', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chery'), 'Tiggo 2 Pro', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chery'), 'Tiggo 3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chery'), 'Tiggo 5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chery'), 'Tiggo 7', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chery'), 'Tiggo 7 Pro', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chery'), 'Tiggo 8 Pro', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Blazer', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Captiva', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Equinox', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2004, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Groove', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Suburban', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1935, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Tahoe', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1994, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Tracker', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Trailblazer', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2001, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Traverse', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2008, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Citroën'), 'C3 Aircross', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Citroën'), 'C5 Aircross', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Cupra'), 'Ateca', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Cupra'), 'Formentor', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Cupra'), 'Tavascan', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2024, NULL),
        ((SELECT id FROM public.brands WHERE name = 'DFSK'), 'Glory 560', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'DFSK'), 'Glory 580', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'DFSK'), 'K01', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'DFSK'), 'K07', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Faw'), 'Bestune T77', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Faw'), 'Bestune T99', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Faw'), 'V2', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Faw'), 'V5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Faw'), 'X40', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Fastback', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2022, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Pulse', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'Bronco', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1966, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'EcoSport', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'Edge', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'Escape', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2000, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'Expedition', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1996, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'Explorer', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1990, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'Territory', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'GAC Motor'), 'Emkoo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2022, NULL),
        ((SELECT id FROM public.brands WHERE name = 'GAC Motor'), 'Emzoom', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2023, NULL),
        ((SELECT id FROM public.brands WHERE name = 'GAC Motor'), 'GS3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'GAC Motor'), 'GS4', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Geely'), 'Azkarra', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Geely'), 'Coolray', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Geely'), 'Geometry C', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Geely'), 'Okavango', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Geely'), 'Tugella', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Geely'), 'Vision', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'GMC'), 'Acadia', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'GMC'), 'Terrain', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Great Wall'), 'Florid', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Great Wall'), 'Haval H6', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2011, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Great Wall'), 'Haval H9', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Great Wall'), 'Tank 300', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Haval'), 'Dargo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Haval'), 'H6', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2011, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Haval'), 'H9', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Haval'), 'Jolion', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'CR-V', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'Element', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2003, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'HR-V', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'Pilot', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'ZRV', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2022, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Creta', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Creta Grand', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Ioniq 5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Kona', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Nexo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Palisade', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Santa Fe', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2000, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Tucson', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2004, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Venue', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Infiniti'), 'QX50', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JAC'), 'JS2', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JAC'), 'JS3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JAC'), 'JS4', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JAC'), 'JS6', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JAC'), 'JS8', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JAC'), 'S2', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JAC'), 'S3', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JAC'), 'S5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Jeep'), 'Avenger', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2023, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Jeep'), 'Cherokee', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1974, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Jeep'), 'Commander', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Jeep'), 'Compass', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Jeep'), 'Grand Cherokee', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1992, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Jeep'), 'Renegade', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Jeep'), 'Wrangler', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1986, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Jetour'), 'Dashing', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2022, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Jetour'), 'X70', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Jetour'), 'X70 Plus', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Jetour'), 'X90 Plus', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Carens', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2022, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'EV6', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'EV9', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2023, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Niro', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Seltos', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Sonet', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Sorento', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Sportage', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1993, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Telluride', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Land Rover'), 'Defender', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1990, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Land Rover'), 'Discovery', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1989, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Land Rover'), 'Discovery Sport', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Land Rover'), 'Range Rover', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1970, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Land Rover'), 'Range Rover Evoque', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2011, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Land Rover'), 'Range Rover Sport', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Land Rover'), 'Range Rover Velar', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Lexus'), 'NX', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Lexus'), 'UX', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Lifan'), 'Myway', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Lifan'), 'X60', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2011, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Lifan'), 'X70', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mahindra'), 'Bolero', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2000, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mahindra'), 'Scorpio', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mahindra'), 'Thar', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mahindra'), 'XUV500', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2011, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Maxus'), 'D60', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Maxus'), 'Euniq 6', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Maxus'), 'T70', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mazda'), 'CX-30', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mazda'), 'CX-5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mazda'), 'CX-9', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz'), 'GLC', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz'), 'GLE', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MG'), 'HS', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MG'), 'Marvel R', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MG'), 'One', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MG'), 'RX5', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MG'), 'ZS', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MG'), 'ZX', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mini'), 'Countryman', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mitsubishi'), 'ASX', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mitsubishi'), 'Eclipse Cross', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mitsubishi'), 'Montero Sport', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1996, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mitsubishi'), 'Outlander', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2001, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mitsubishi'), 'Pajero', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1982, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'Kicks', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'Patrol', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1951, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'Qashqai', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'X-Trail', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2000, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'Xterra', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Opel'), 'Crossland', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Opel'), 'Grandland', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Opel'), 'Mokka', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), '2008', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), '3008', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2009, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), '5008', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2009, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Porsche'), 'Cayenne', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Porsche'), 'Macan', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Arkana', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Captur', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Duster', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Koleos', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Stepway', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2008, NULL),
        ((SELECT id FROM public.brands WHERE name = 'SEAT'), 'Arona', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'SEAT'), 'Ateca', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'SEAT'), 'Tarraco', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Skoda'), 'Kamiq', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Skoda'), 'Karoq', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Skoda'), 'Kodiaq', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'SsangYong'), 'Korando', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1983, NULL),
        ((SELECT id FROM public.brands WHERE name = 'SsangYong'), 'Rexton', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2001, NULL),
        ((SELECT id FROM public.brands WHERE name = 'SsangYong'), 'Tivoli', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'SsangYong'), 'Torres', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2022, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Subaru'), 'Crosstrek', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2022, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Subaru'), 'Evoltis', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Subaru'), 'Forester', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1997, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Subaru'), 'XV', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2011, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki'), 'Grand Vitara', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1998, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki'), 'Jimny', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1970, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki'), 'S-Cross', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki'), 'S-Presso', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki'), 'Vitara', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1988, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki'), 'XL7', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1998, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Tata Motors'), 'Harrier', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Tata Motors'), 'Nexon', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Tata Motors'), 'Safari', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1998, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Tesla'), 'Model X', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Tesla'), 'Model Y', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), '4Runner', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1984, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Corolla Cross', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Fortuner', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2004, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Land Cruiser', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1951, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Prado', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1987, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'RAV4', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1994, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Sequoia', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2000, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'ID.4', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Nivus', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'T-Cross', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Taos', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Tiguan', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Touareg', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo'), 'XC60', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2008, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo'), 'XC90', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2002, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Pickups (carrocería dentro de Autos)
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
        ((SELECT id FROM public.brands WHERE name = 'Changan'), 'Hunter', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Colorado', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2004, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Montana', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2003, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'S10', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Silverado', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1998, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Chevrolet'), 'Silverado HD', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2001, NULL),
        ((SELECT id FROM public.brands WHERE name = 'DFSK'), 'Glory 330', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Strada', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1998, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Titano', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2023, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Toro', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'F-150', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1948, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'F-250', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1953, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'F-350', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1953, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'Maverick', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford'), 'Ranger', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1982, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Great Wall'), 'Poer', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Great Wall'), 'Wingle', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'Ridgeline', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'H100', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1987, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Santa Cruz', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Isuzu'), 'D-Max', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JAC'), 'T6', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JAC'), 'T8', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JAC'), 'T8 Pro', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2022, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JAC'), 'T9', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2023, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Jeep'), 'Gladiator', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JMC'), 'Vigus', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JMC'), 'Vigus Pro', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JMC'), 'Vigus Work', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'K2700', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1990, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Maxus'), 'T60', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Maxus'), 'T90', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mazda'), 'BT-50', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mitsubishi'), 'L200', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1978, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'Frontier', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1997, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'Navara', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1985, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'NP300', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1997, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), 'Hoggar', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), 'Landtrek', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ram'), '1000', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ram'), '1500', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2009, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ram'), '2500', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ram'), '3500', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ram'), '700', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ram'), 'Rampage', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2023, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Alaskan', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Duster Oroch', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'SsangYong'), 'Musso', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1993, NULL),
        ((SELECT id FROM public.brands WHERE name = 'SsangYong'), 'Musso Grand', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Tesla'), 'Cybertruck', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2023, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Hilux', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1968, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Tacoma', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Tundra', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Amarok', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Saveiro', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1982, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Vans (carrocería dentro de Autos)
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
        ((SELECT id FROM public.brands WHERE name = 'Citroën'), 'Berlingo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1996, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Citroën'), 'SpaceTourer', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Ducato', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1981, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Fiorino', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1977, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Fiat'), 'Scudo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1994, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford Transit'), 'Nugget', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford Transit'), 'Tourneo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford Transit'), 'Transit', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1965, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford Transit'), 'Transit Connect', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ford Transit'), 'Transit Custom', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'GAC Motor'), 'GN6', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda'), 'Odyssey', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1994, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'Staria', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JMC'), 'Touring', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kia'), 'Carnival', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1998, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Maxus'), 'G10', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Maxus'), 'V80', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Maxus'), 'V90', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz'), 'Sprinter', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Vans'), 'Citan', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Vans'), 'Conecto', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2003, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Vans'), 'eSprinter', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Vans'), 'Metrocity', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Vans'), 'Sprinter', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Vans'), 'Vito', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1996, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mitsubishi'), 'Xpander', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Nissan'), 'Urvan', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1973, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Opel'), 'Combo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1986, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), 'Boxer', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1994, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), 'Expert', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), 'Partner', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1996, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), 'Rifter', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peugeot'), 'Traveller', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Ram'), 'ProMaster', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Express', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Kangoo', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1997, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Master', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1980, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault'), 'Trafic', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1980, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki'), 'Ertiga', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Hiace', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1967, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'ProAce', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Toyota'), 'Sienna', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1997, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Transporter', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1950, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen Crafter'), 'California', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1988, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen Crafter'), 'Caravelle', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1979, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen Crafter'), 'Crafter', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen Crafter'), 'Grand California', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen Crafter'), 'LT', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 1975, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen Crafter'), 'Multivan', (SELECT id FROM public.vehicle_types WHERE name = 'Auto' LIMIT 1), 2003, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Motos
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
        ((SELECT id FROM public.brands WHERE name = 'Bajaj Auto'), 'Dominar 400', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Bajaj Auto'), 'Pulsar NS200', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Benelli'), '302S', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Benelli'), '752S', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Benelli'), 'Leoncino 500', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Benelli'), 'TNT 600', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Benelli'), 'TRK 502', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'CFMoto'), '300NK', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'CFMoto'), '400NK', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'CFMoto'), '650GT', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'CFMoto'), '650NK', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'CFMoto'), '700CL-X', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Harley-Davidson'), 'Dyna Super Glide', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 1991, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Harley-Davidson'), 'Livewire', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Harley-Davidson'), 'Softail Standard', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2000, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Harley-Davidson'), 'Sportster Iron 883', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2009, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Harley-Davidson'), 'Touring Road King', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 1994, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hero MotoCorp'), 'Hunk 200R', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda Motorcycle'), 'Africa Twin', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda Motorcycle'), 'CB650R', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda Motorcycle'), 'CBR600RR', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2003, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda Motorcycle'), 'Gold Wing', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 1975, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Honda Motorcycle'), 'Rebel 500', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kawasaki'), 'KLX230', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kawasaki'), 'Ninja ZX-10R', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2004, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kawasaki'), 'Versys-X 300', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kawasaki'), 'Vulcan S', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kawasaki'), 'Z900', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Royal Enfield'), 'Himalayan', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki Motorcycle'), 'Boulevard M109R', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki Motorcycle'), 'GSX-R1000', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2001, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki Motorcycle'), 'Hayabusa', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki Motorcycle'), 'SV650', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Suzuki Motorcycle'), 'V-Strom 650', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2004, NULL),
        ((SELECT id FROM public.brands WHERE name = 'TVS Motor'), 'Apache RTR 200', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Yamaha'), 'MT-09', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Yamaha'), 'Ténéré 700', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Yamaha'), 'Tracer 900', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Yamaha'), 'XSR900', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Yamaha'), 'YZF-R1', (SELECT id FROM public.vehicle_types WHERE name = 'Moto' LIMIT 1), 1998, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Camiones
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
        ((SELECT id FROM public.brands WHERE name = 'Ashok Leyland'), 'U-Truck', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'DAF'), 'CF', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2000, NULL),
        ((SELECT id FROM public.brands WHERE name = 'DAF'), 'LF', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2001, NULL),
        ((SELECT id FROM public.brands WHERE name = 'DAF'), 'XF', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1997, NULL),
        ((SELECT id FROM public.brands WHERE name = 'DAF'), 'XG', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'DAF'), 'XG+', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2021, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Dongfeng'), 'Captain', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Dongfeng'), 'D9', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Freightliner'), 'Argosy', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Freightliner'), 'Cascadia', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Freightliner'), 'Century Class', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1996, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Freightliner'), 'Columbia', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2001, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Freightliner'), 'Coronado', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2009, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hino'), '500 Series', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1999, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Hyundai'), 'HD78', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'International'), 'LT', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'International'), 'ProStar', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'International'), 'RH', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'International'), 'TerraStar', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'International'), 'WorkStar', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2008, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Isuzu'), 'N-Series', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1959, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Iveco'), 'Daily', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1978, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Iveco'), 'Eurocargo', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1991, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Iveco'), 'S-Way', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Iveco'), 'Stralis', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Iveco'), 'Trakker', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2004, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kenworth'), 'K370', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kenworth'), 'T680', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kenworth'), 'T800', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kenworth'), 'T880', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Kenworth'), 'W900', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1961, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mack'), 'Anthem', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mack'), 'Granite', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mack'), 'MD', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mack'), 'Pinnacle', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mack'), 'Titan', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MAN'), 'TGA', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2000, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MAN'), 'TGL', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MAN'), 'TGM', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MAN'), 'TGS', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'MAN'), 'TGX', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2000, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Trucks'), 'Actros', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1996, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Trucks'), 'Arocs', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Trucks'), 'Atego', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1998, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Trucks'), 'Axor', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2002, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Trucks'), 'Sprinter', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peterbilt'), '348', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peterbilt'), '389', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peterbilt'), '520', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peterbilt'), '567', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Peterbilt'), '579', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault Trucks'), 'C', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault Trucks'), 'D', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault Trucks'), 'K', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault Trucks'), 'Master', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1980, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Renault Trucks'), 'T', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Scania'), 'G', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Scania'), 'L', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Scania'), 'P', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Scania'), 'R', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2004, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Scania'), 'S', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Tata Motors'), 'Prima', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2008, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Constellation', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volkswagen'), 'Delivery', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo'), 'FH', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1993, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo Trucks'), 'FH', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1993, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo Trucks'), 'FM', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1998, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo Trucks'), 'FMX', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo Trucks'), 'VNL', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1996, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo Trucks'), 'VNR', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Western Star'), '4700', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1990, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Western Star'), '4800', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Western Star'), '4900', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1990, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Western Star'), '5700XE', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 2017, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Western Star'), '6900', (SELECT id FROM public.vehicle_types WHERE name = 'Camión' LIMIT 1), 1990, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Buses
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
        ((SELECT id FROM public.brands WHERE name = 'Agrale'), 'MT17.0', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Caio'), 'Apache VIP', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2001, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Irizar'), 'i6', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2011, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Irizar'), 'i8', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2016, NULL),
        ((SELECT id FROM public.brands WHERE name = 'King Long'), 'XMQ6107Y', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'King Long'), 'XMQ6127Y', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'King Long'), 'XMQ6128Y', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'King Long'), 'XMQ6140Y', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'King Long'), 'XMQ6180Y', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2020, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Marcopolo'), 'Andesmar', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Marcopolo'), 'Ideale', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 1995, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Marcopolo'), 'Paradiso', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 1990, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Marcopolo'), 'Senior', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2000, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Marcopolo'), 'Viaggio', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Buses'), 'Citaro', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 1997, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Buses'), 'Conecto', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2003, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Buses'), 'Intouro', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Buses'), 'Sprinter City', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2011, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Mercedes-Benz Buses'), 'Tourismo', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2006, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Neobus'), 'Mega', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2008, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Setra'), 'ComfortClass', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'VDL'), 'Citea', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo Buses'), '9700', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2001, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo Buses'), '9900', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2001, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo Buses'), 'B11R', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2011, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo Buses'), 'B7R', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2005, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Volvo Buses'), 'B8R', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2013, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Yutong'), 'ZK6108H', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2012, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Yutong'), 'ZK6122H', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Yutong'), 'ZK6128H', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2015, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Yutong'), 'ZK6140H', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2018, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Yutong'), 'ZK6180H', (SELECT id FROM public.vehicle_types WHERE name = 'Bus' LIMIT 1), 2020, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Maquinaria
    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES
        ((SELECT id FROM public.brands WHERE name = 'Bobcat'), 'S650', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Bobcat'), 'T770', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2011, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Case IH'), 'Magnum', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1987, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Case IH'), 'Puma', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Caterpillar'), 'D10', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1977, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Caterpillar'), 'D11', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1986, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Caterpillar'), 'D6', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1940, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Caterpillar'), 'D8', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1935, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Caterpillar'), 'D9', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1954, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Doosan'), 'DL300', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JCB'), '3CX', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1980, NULL),
        ((SELECT id FROM public.brands WHERE name = 'JCB'), '4CX', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1994, NULL),
        ((SELECT id FROM public.brands WHERE name = 'John Deere'), '8R', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'John Deere'), '9630', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'John Deere'), '9630R', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'John Deere'), '9R', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2014, NULL),
        ((SELECT id FROM public.brands WHERE name = 'John Deere'), '9RX', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2019, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Komatsu'), 'D155', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1974, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Komatsu'), 'D275', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1980, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Komatsu'), 'D375', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1988, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Komatsu'), 'D65', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1960, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Komatsu'), 'D85', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 1968, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Liebherr'), 'L556', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2007, NULL),
        ((SELECT id FROM public.brands WHERE name = 'New Holland'), 'T7', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'New Holland'), 'T9', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2010, NULL),
        ((SELECT id FROM public.brands WHERE name = 'Terex'), 'RT 90', (SELECT id FROM public.vehicle_types WHERE name = 'Maquinaria' LIMIT 1), 2014, NULL)
    ON CONFLICT (brand_id, name) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Asegurar que la columna features existe en subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb;

-- ===========================================
-- EJECUCIÓN DEL SEED DATA
-- ===========================================

DO $$
BEGIN
    -- Insertar planes de suscripción alineados al nuevo esquema
    INSERT INTO public.subscription_plans (
        plan_key, name, description, vertical_id, target_type,
        limits, features, price_monthly, price_yearly, currency, is_active
    ) VALUES
        (
            'free', 'Gratuito', 'Plan básico para comenzar',
            (SELECT id FROM public.verticals WHERE key = 'vehicles'), 'both',
            jsonb_build_object(
                'max_listings', 3,
                'max_featured', 0,
                'max_images', 5,
                'can_use_boost', false,
                'can_use_analytics', false
            ),
            jsonb_build_array(
                '3 publicaciones activas',
                '5 fotos por publicación',
                'Soporte básico'
            ),
            0, NULL, 'CLP', true
        ),
        (
            'basic', 'Básico', 'Para vendedores individuales',
            (SELECT id FROM public.verticals WHERE key = 'vehicles'), 'both',
            jsonb_build_object(
                'max_listings', 10,
                'max_featured', 1,
                'max_images', 10,
                'can_use_boost', true,
                'can_use_analytics', false
            ),
            jsonb_build_array(
                '10 publicaciones activas',
                '1 publicación destacada',
                '10 fotos por publicación',
                'Estadísticas básicas'
            ),
            14990, NULL, 'CLP', true
        ),
        (
            'pro', 'Profesional', 'Para concesionarios pequeños',
            (SELECT id FROM public.verticals WHERE key = 'vehicles'), 'both',
            jsonb_build_object(
                'max_listings', 50,
                'max_featured', 5,
                'max_images', 20,
                'can_use_boost', true,
                'can_use_analytics', true
            ),
            jsonb_build_array(
                '50 publicaciones activas',
                '5 publicaciones destacadas',
                '20 fotos por publicación',
                'CRM completo',
                'Estadísticas avanzadas',
                'Soporte prioritario'
            ),
            39990, NULL, 'CLP', true
        ),
        (
            'enterprise', 'Empresarial', 'Para grandes concesionarios',
            (SELECT id FROM public.verticals WHERE key = 'vehicles'), 'both',
            jsonb_build_object(
                'max_listings', -1,
                'max_featured', -1,
                'max_images', 50,
                'can_use_boost', true,
                'can_use_analytics', true
            ),
            jsonb_build_array(
                'Publicaciones ilimitadas',
                'Destacados ilimitados',
                '50 fotos por publicación',
                'CRM avanzado',
                'API completa',
                'Soporte 24/7',
                'Marcas personalizadas',
                'Análisis avanzado'
            ),
            99990, NULL, 'CLP', true
        )
    ON CONFLICT (vertical_id, plan_key) DO UPDATE
    SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        vertical_id = EXCLUDED.vertical_id,
        target_type = EXCLUDED.target_type,
        limits = EXCLUDED.limits,
        features = EXCLUDED.features,
        price_monthly = EXCLUDED.price_monthly,
        price_yearly = EXCLUDED.price_yearly,
        currency = EXCLUDED.currency,
        is_active = EXCLUDED.is_active;

    -- Mensaje de confirmación
    RAISE NOTICE '🌱 SEED DATA INSERTADO EXITOSAMENTE';
    RAISE NOTICE '📍 Regiones y comunas de Chile completas';
    RAISE NOTICE '🚗 Marcas y tipos de vehículos incluidos (Auto, Moto, Camión, Bus, Maquinaria, Aéreo, Náutico)';
    RAISE NOTICE '💰 Planes de suscripción configurados';
    RAISE NOTICE '✅ Datos listos para usar';
END $$;

-- =====================================================================
-- Source migration: 20251231143000_seed_aerial_nautical_models.sql
-- =====================================================================
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

-- =====================================================================
-- Source migration: 20260104094500_seed_features_catalog_car.sql
-- =====================================================================
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

-- =====================================================================
-- Source migration: 20260109090000_seed_subscription_plans_pricing.sql
-- =====================================================================
-- Seed/update subscription plans (Chile market pricing)
-- Keeps plan_key stable; safe to re-run.

INSERT INTO public.subscription_plans (
  vertical_id,
  plan_key,
  name,
  description,
  target_type,
  limits,
  features,
  price_monthly,
  currency,
  is_active
) VALUES
  (
    (SELECT id FROM public.verticals WHERE key = 'vehicles' LIMIT 1),
    'pro',
    'Pro',
    'Publica más, activa tu página pública y accede a estadísticas.',
    'both',
    '{"max_active_listings": 10}'::jsonb,
    '["Hasta 10 publicaciones activas","Activa tu página pública","Estadísticas"]'::jsonb,
    9990,
    'CLP',
    true
  ),
  (
    (SELECT id FROM public.verticals WHERE key = 'vehicles' LIMIT 1),
    'business',
    'Empresa',
    'Próximamente disponible: pensado para equipos y operación multi-sucursal.',
    'both',
    '{"max_active_listings": -1}'::jsonb,
    '["Próximamente: multiusuario (equipo)","Próximamente: branding avanzado","Próximamente: integraciones reales"]'::jsonb,
    39990,
    'CLP',
    false
  )
ON CONFLICT (vertical_id, plan_key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  vertical_id = EXCLUDED.vertical_id,
  target_type = EXCLUDED.target_type,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  price_monthly = EXCLUDED.price_monthly,
  currency = EXCLUDED.currency,
  is_active = EXCLUDED.is_active,
  updated_at = now();
