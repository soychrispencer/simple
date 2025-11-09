-- MIGRACIÓN CONSOLIDADA FINAL: ESQUEMA COMPLETO PARA MARKETPLACE DE VEHÍCULOS
-- Autor: GitHub Copilot | Fecha: 2025-10-21
-- Este archivo contiene TODO el esquema actual del proyecto SimpleAutos
-- Incluye todas las tablas, funciones, políticas RLS y datos iniciales
-- Ejecuta este archivo en un entorno limpio para tener la base de datos completa

/*
============================
 0. LIMPIEZA INICIAL (OPCIONAL, PARA ENTORNOS NO LIMPIOS)
============================
*/
-- Eliminar triggers existentes (si existen)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_timestamp' AND event_object_schema = 'public') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_timestamp ON public.vehicles';
    EXECUTE 'DROP TRIGGER IF EXISTS update_timestamp ON public.profiles';
    EXECUTE 'DROP TRIGGER IF EXISTS update_timestamp ON public.companies';
    EXECUTE 'DROP TRIGGER IF EXISTS update_timestamp ON public.vehicle_boosts';
    EXECUTE 'DROP TRIGGER IF EXISTS update_timestamp ON public.boost_plans';
    EXECUTE 'DROP TRIGGER IF EXISTS update_timestamp ON public.payments';
    EXECUTE 'DROP TRIGGER IF EXISTS update_timestamp ON public.subscriptions';
    EXECUTE 'DROP TRIGGER IF EXISTS update_timestamp ON public.invoices';
  END IF;
END $$;

-- Eliminar tablas existentes (en orden inverso de dependencias)
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.boost_daily_stats CASCADE;
DROP TABLE IF EXISTS public.vehicle_boost_slots CASCADE;
DROP TABLE IF EXISTS public.vehicle_boosts CASCADE;
DROP TABLE IF EXISTS public.boost_plans CASCADE;
DROP TABLE IF EXISTS public.vehicle_sales CASCADE;
DROP TABLE IF EXISTS public.vehicle_features CASCADE;
DROP TABLE IF EXISTS public.vehicle_media CASCADE;
DROP TABLE IF EXISTS public.vehicle_metrics CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.commercial_conditions CASCADE;
DROP TABLE IF EXISTS public.social_links CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.models CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.vehicle_types CASCADE;
DROP TABLE IF EXISTS public.vehicle_subtypes CASCADE;
DROP TABLE IF EXISTS public.vehicle_equipment CASCADE;
DROP TABLE IF EXISTS public.vehicle_selected_equipment CASCADE;
DROP TABLE IF EXISTS public.features_catalog CASCADE;
DROP TABLE IF EXISTS public.communes CASCADE;
DROP TABLE IF EXISTS public.regions CASCADE;

-- Eliminar tipos ENUM existentes
DROP TYPE IF EXISTS boost_status CASCADE;
DROP TYPE IF EXISTS vehicle_condition CASCADE;
DROP TYPE IF EXISTS vehicle_status CASCADE;

-- Eliminar secuencia
DROP SEQUENCE IF EXISTS public.boost_plans_id_seq CASCADE;

-- Eliminar función
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS increment_vehicle_metric(uuid, text, integer) CASCADE;

/*
============================
 1. EXTENSIONES Y TIPOS
============================
*/
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
CREATE TYPE vehicle_status AS ENUM ('draft','active','paused','sold','expired');
CREATE TYPE vehicle_condition AS ENUM ('unknown','new','used','excellent','good','fair','poor','damaged');
CREATE TYPE boost_status AS ENUM ('active','expired','cancelled');

/*
============================
 2. TABLAS DE REFERENCIA
============================
*/
-- Regiones de Chile
CREATE TABLE public.regions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Comunas
CREATE TABLE public.communes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  region_id INTEGER REFERENCES public.regions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(region_id, name)
);

-- Tipos de vehículo
CREATE TABLE public.vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at timestamptz DEFAULT now()
);

-- Subtipos de vehículo
CREATE TABLE public.vehicle_subtypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID NOT NULL REFERENCES public.vehicle_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(type_id, slug)
);

-- Marcas
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at timestamptz DEFAULT now()
);

-- Modelos
CREATE TABLE public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  year_from INTEGER,
  year_to INTEGER,
  created_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, slug)
);

-- Catálogo de equipamiento
CREATE TABLE public.features_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  created_at timestamptz DEFAULT now()
);

/*
============================
 3. TABLAS PRINCIPALES
============================
*/
-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Perfiles de usuario
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  location TEXT,
  is_company BOOLEAN DEFAULT false,
  company_name TEXT,
  company_rut TEXT,
  company_description TEXT,
  horario247 BOOLEAN DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Empresas
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  rut TEXT UNIQUE,
  description TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  social_links jsonb DEFAULT '{}'::jsonb,
  verified BOOLEAN DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vehículos
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  type_id UUID NOT NULL REFERENCES public.vehicle_types(id),
  subtype_id UUID REFERENCES public.vehicle_subtypes(id),
  brand_id UUID REFERENCES public.brands(id),
  model_id UUID REFERENCES public.models(id),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  year INTEGER CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM now())+1),
  mileage INTEGER,
  condition vehicle_condition NOT NULL DEFAULT 'used',
  status vehicle_status NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'public',
  featured BOOLEAN NOT NULL DEFAULT false,
  published_at timestamptz,
  sold_at timestamptz,
  sale_price NUMERIC,
  region_id INTEGER REFERENCES public.regions(id),
  commune_id INTEGER REFERENCES public.communes(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  rent_daily_price NUMERIC,
  rent_weekly_price NUMERIC,
  rent_monthly_price NUMERIC,
  rent_security_deposit NUMERIC,
  auction_start_price NUMERIC,
  auction_start_at timestamptz,
  auction_end_at timestamptz,
  allow_financing BOOLEAN DEFAULT false,
  allow_exchange BOOLEAN DEFAULT false,
  listing_type TEXT NOT NULL DEFAULT 'sale' CHECK (listing_type IN ('sale','rent','auction')),
  specs jsonb DEFAULT '{}'::jsonb
);

-- Condiciones comerciales por vehículo
CREATE TABLE public.commercial_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('sale', 'rent', 'auction')),
  price NUMERIC DEFAULT 0,
  negotiable BOOLEAN DEFAULT false,
  allows_tradein BOOLEAN DEFAULT false,
  warranty TEXT,
  delivery_immediate BOOLEAN DEFAULT false,
  documentation_complete BOOLEAN DEFAULT false,
  in_consignment BOOLEAN DEFAULT false,
  billable BOOLEAN DEFAULT false,
  financing jsonb DEFAULT '{}'::jsonb,
  bonuses jsonb DEFAULT '[]'::jsonb,
  discounts jsonb DEFAULT '[]'::jsonb,
  additional_conditions TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_id, mode)
);

-- Equipamiento seleccionado por vehículo (many-to-many)
CREATE TABLE public.vehicle_selected_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.features_catalog(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_id, feature_id)
);

-- Media de vehículos
CREATE TABLE public.vehicle_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  url TEXT NOT NULL,
  alt_text TEXT,
  position INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Características específicas de vehículos
CREATE TABLE public.vehicle_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.features_catalog(id) ON DELETE CASCADE,
  value TEXT,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_id, feature_id)
);

/*
============================
 4. MÉTRICAS Y ANALYTICS
============================
*/
-- Tabla de métricas de vehículos
CREATE TABLE public.vehicle_metrics (
  vehicle_id UUID NOT NULL PRIMARY KEY REFERENCES public.vehicles(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Función para incrementar métricas
CREATE OR REPLACE FUNCTION public.increment_vehicle_metric(
  p_vehicle_id UUID,
  p_metric TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.vehicle_metrics (vehicle_id, views, clicks, favorites, shares)
  VALUES (p_vehicle_id,
    CASE WHEN p_metric = 'views' THEN p_amount ELSE 0 END,
    CASE WHEN p_metric = 'clicks' THEN p_amount ELSE 0 END,
    CASE WHEN p_metric = 'favorites' THEN p_amount ELSE 0 END,
    CASE WHEN p_metric = 'shares' THEN p_amount ELSE 0 END
  )
  ON CONFLICT (vehicle_id)
  DO UPDATE SET
    views = CASE
      WHEN p_metric = 'views'
      THEN vehicle_metrics.views + p_amount
      ELSE vehicle_metrics.views
    END,
    clicks = CASE
      WHEN p_metric = 'clicks'
      THEN vehicle_metrics.clicks + p_amount
      ELSE vehicle_metrics.clicks
    END,
    favorites = CASE
      WHEN p_metric = 'favorites'
      THEN vehicle_metrics.favorites + p_amount
      ELSE vehicle_metrics.favorites
    END,
    shares = CASE
      WHEN p_metric = 'shares'
      THEN vehicle_metrics.shares + p_amount
      ELSE vehicle_metrics.shares
    END,
    updated_at = now();
END;
$$;

/*
============================
 5. SISTEMA DE BOOSTS
============================
*/
-- Planes de boost
CREATE TABLE public.boost_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  duration_days INTEGER NOT NULL,
  max_slots INTEGER NOT NULL DEFAULT 1,
  features jsonb DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Boosts activos de vehículos
CREATE TABLE public.vehicle_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.boost_plans(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  status boost_status NOT NULL DEFAULT 'active',
  slots_used INTEGER DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Slots de boost por día
CREATE TABLE public.vehicle_boost_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_id UUID NOT NULL REFERENCES public.vehicle_boosts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  slot_position INTEGER NOT NULL CHECK (slot_position > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(boost_id, date, slot_position)
);

-- Estadísticas diarias de boosts
CREATE TABLE public.boost_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_id UUID NOT NULL REFERENCES public.vehicle_boosts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(boost_id, date)
);

/*
============================
 6. SISTEMA DE PAGOS Y SUSCRIPCIONES
============================
*/
-- Pagos
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CLP',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  external_id TEXT,
  description TEXT,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Suscripciones
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end BOOLEAN DEFAULT false,
  external_id TEXT,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Facturas
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CLP',
  status TEXT NOT NULL DEFAULT 'draft',
  due_date timestamptz,
  paid_at timestamptz,
  external_id TEXT,
  pdf_url TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

/*
============================
 7. NOTIFICACIONES
============================
*/
-- Notificaciones
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data jsonb DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at timestamptz DEFAULT now()
);

/*
============================
 8. VENTAS Y TRANSACCIONES
============================
*/
-- Ventas completadas
CREATE TABLE public.vehicle_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  buyer_id UUID REFERENCES public.profiles(id),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  sale_price NUMERIC NOT NULL,
  commission NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  transaction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

/*
============================
 9. TRIGGERS PARA UPDATED_AT
============================
*/
-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_boosts_updated_at BEFORE UPDATE ON public.vehicle_boosts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_metrics_updated_at BEFORE UPDATE ON public.vehicle_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

/*
============================
 10. POLÍTICAS ROW LEVEL SECURITY (RLS)
============================
*/
-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_selected_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_boost_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_sales ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow null user_id for anonymous profiles" ON public.profiles FOR INSERT WITH CHECK (user_id IS NULL);

-- Políticas para companies
CREATE POLICY "Users can view companies they own" ON public.companies FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can manage companies they own" ON public.companies FOR ALL USING (auth.uid() = owner_id);

-- Políticas para vehicles
CREATE POLICY "Anyone can view active vehicles" ON public.vehicles FOR SELECT USING (status = 'active' OR auth.uid() = owner_id);
CREATE POLICY "Users can manage their own vehicles" ON public.vehicles FOR ALL USING (auth.uid() = owner_id);

-- Políticas para commercial_conditions
CREATE POLICY "Anyone can view commercial conditions of active vehicles" ON public.commercial_conditions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND (status = 'active' OR owner_id = auth.uid()))
);
CREATE POLICY "Users can manage commercial conditions of their own vehicles" ON public.commercial_conditions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND owner_id = auth.uid())
);

-- Políticas para vehicle_selected_equipment
CREATE POLICY "Anyone can view equipment of active vehicles" ON public.vehicle_selected_equipment FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND (status = 'active' OR owner_id = auth.uid()))
);
CREATE POLICY "Users can manage equipment of their own vehicles" ON public.vehicle_selected_equipment FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND owner_id = auth.uid())
);

-- Políticas para vehicle_media
CREATE POLICY "Anyone can view media of active vehicles" ON public.vehicle_media FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND (status = 'active' OR owner_id = auth.uid()))
);
CREATE POLICY "Users can manage media of their own vehicles" ON public.vehicle_media FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND owner_id = auth.uid())
);

-- Políticas para vehicle_features
CREATE POLICY "Anyone can view features of active vehicles" ON public.vehicle_features FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND (status = 'active' OR owner_id = auth.uid()))
);
CREATE POLICY "Users can manage features of their own vehicles" ON public.vehicle_features FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND owner_id = auth.uid())
);

-- Políticas para vehicle_metrics
CREATE POLICY "Anyone can view metrics of active vehicles" ON public.vehicle_metrics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND (status = 'active' OR owner_id = auth.uid()))
);
CREATE POLICY "Users can manage metrics of their own vehicles" ON public.vehicle_metrics FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND owner_id = auth.uid())
);

-- Políticas para boost_plans
CREATE POLICY "Anyone can view active boost plans" ON public.boost_plans FOR SELECT USING (active = true);

-- Políticas para vehicle_boosts
CREATE POLICY "Users can view boosts of their own vehicles" ON public.vehicle_boosts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage boosts of their own vehicles" ON public.vehicle_boosts FOR ALL USING (auth.uid() = user_id);

-- Políticas para vehicle_boost_slots
CREATE POLICY "Users can view boost slots of their own vehicles" ON public.vehicle_boost_slots FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM public.vehicle_boosts WHERE id = boost_id)
);
CREATE POLICY "Users can manage boost slots of their own vehicles" ON public.vehicle_boost_slots FOR ALL USING (
  auth.uid() = (SELECT user_id FROM public.vehicle_boosts WHERE id = boost_id)
);

-- Políticas para boost_daily_stats
CREATE POLICY "Users can view boost stats of their own vehicles" ON public.boost_daily_stats FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM public.vehicle_boosts WHERE id = boost_id)
);
CREATE POLICY "Users can manage boost stats of their own vehicles" ON public.boost_daily_stats FOR ALL USING (
  auth.uid() = (SELECT user_id FROM public.vehicle_boosts WHERE id = boost_id)
);

-- Políticas para payments
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own payments" ON public.payments FOR ALL USING (auth.uid() = user_id);

-- Políticas para subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own subscriptions" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);

-- Políticas para invoices
CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own invoices" ON public.invoices FOR ALL USING (auth.uid() = user_id);

-- Políticas para notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Políticas para vehicle_sales
CREATE POLICY "Users can view sales where they are buyer or seller" ON public.vehicle_sales FOR SELECT USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);
CREATE POLICY "Users can manage sales where they are seller" ON public.vehicle_sales FOR ALL USING (auth.uid() = seller_id);

/*
============================
 11. DATOS INICIALES
============================
*/
-- Insertar regiones de Chile
INSERT INTO public.regions (name, slug) VALUES
  ('Arica y Parinacota', 'arica-parinacota'),
  ('Tarapacá', 'tarapaca'),
  ('Antofagasta', 'antofagasta'),
  ('Atacama', 'atacama'),
  ('Coquimbo', 'coquimbo'),
  ('Valparaíso', 'valparaiso'),
  ('Metropolitana', 'metropolitana'),
  ('O''Higgins', 'ohiggins'),
  ('Maule', 'maule'),
  ('Ñuble', 'nuble'),
  ('Biobío', 'biobio'),
  ('Araucanía', 'araucania'),
  ('Los Ríos', 'los-rios'),
  ('Los Lagos', 'los-lagos'),
  ('Aysén', 'aysen'),
  ('Magallanes', 'magallanes')
ON CONFLICT (name) DO NOTHING;

-- Insertar tipos de vehículo
INSERT INTO public.vehicle_types (name, slug, description) VALUES
  ('Automóvil', 'automovil', 'Vehículos de pasajeros'),
  ('Camioneta', 'camioneta', 'Vehículos utilitarios'),
  ('Motocicleta', 'motocicleta', 'Vehículos de dos ruedas'),
  ('Camión', 'camion', 'Vehículos de carga pesada'),
  ('Maquinaria', 'maquinaria', 'Equipos industriales')
ON CONFLICT (name) DO NOTHING;

-- Insertar planes de boost
INSERT INTO public.boost_plans (name, description, price, duration_days, max_slots, features) VALUES
  ('Básico', 'Boost básico por 7 días', 5000, 7, 1, '{"priority": 1, "featured": false}'),
  ('Premium', 'Boost premium por 15 días', 10000, 15, 2, '{"priority": 2, "featured": true}'),
  ('VIP', 'Boost VIP por 30 días', 20000, 30, 3, '{"priority": 3, "featured": true, "top_slot": true}')
ON CONFLICT (name) DO NOTHING;

-- Insertar comunas chilenas
INSERT INTO public.communes (region_id, name, slug) VALUES
  ((SELECT id FROM public.regions WHERE slug = 'arica-parinacota'), 'Arica', 'arica'),
  ((SELECT id FROM public.regions WHERE slug = 'arica-parinacota'), 'Camarones', 'camarones'),
  ((SELECT id FROM public.regions WHERE slug = 'arica-parinacota'), 'Putre', 'putre'),
  ((SELECT id FROM public.regions WHERE slug = 'arica-parinacota'), 'General Lagos', 'general-lagos'),
  ((SELECT id FROM public.regions WHERE slug = 'tarapaca'), 'Iquique', 'iquique'),
  ((SELECT id FROM public.regions WHERE slug = 'tarapaca'), 'Alto Hospicio', 'alto-hospicio'),
  ((SELECT id FROM public.regions WHERE slug = 'tarapaca'), 'Pozo Almonte', 'pozo-almonte'),
  ((SELECT id FROM public.regions WHERE slug = 'tarapaca'), 'Camiña', 'camina'),
  ((SELECT id FROM public.regions WHERE slug = 'tarapaca'), 'Colchane', 'colchane'),
  ((SELECT id FROM public.regions WHERE slug = 'tarapaca'), 'Huara', 'huara'),
  ((SELECT id FROM public.regions WHERE slug = 'tarapaca'), 'Pica', 'pica'),
  ((SELECT id FROM public.regions WHERE slug = 'antofagasta'), 'Antofagasta', 'antofagasta'),
  ((SELECT id FROM public.regions WHERE slug = 'antofagasta'), 'Mejillones', 'mejillones'),
  ((SELECT id FROM public.regions WHERE slug = 'antofagasta'), 'Sierra Gorda', 'sierra-gorda'),
  ((SELECT id FROM public.regions WHERE slug = 'antofagasta'), 'Taltal', 'taltal'),
  ((SELECT id FROM public.regions WHERE slug = 'antofagasta'), 'Calama', 'calama'),
  ((SELECT id FROM public.regions WHERE slug = 'antofagasta'), 'Ollagüe', 'ollague'),
  ((SELECT id FROM public.regions WHERE slug = 'antofagasta'), 'San Pedro de Atacama', 'san-pedro-atacama'),
  ((SELECT id FROM public.regions WHERE slug = 'antofagasta'), 'Tocopilla', 'tocopilla'),
  ((SELECT id FROM public.regions WHERE slug = 'antofagasta'), 'María Elena', 'maria-elena'),
  ((SELECT id FROM public.regions WHERE slug = 'atacama'), 'Copiapó', 'copiapo'),
  ((SELECT id FROM public.regions WHERE slug = 'atacama'), 'Caldera', 'caldera'),
  ((SELECT id FROM public.regions WHERE slug = 'atacama'), 'Tierra Amarilla', 'tierra-amarilla'),
  ((SELECT id FROM public.regions WHERE slug = 'atacama'), 'Chañaral', 'chanaral'),
  ((SELECT id FROM public.regions WHERE slug = 'atacama'), 'Diego de Almagro', 'diego-almagro'),
  ((SELECT id FROM public.regions WHERE slug = 'atacama'), 'Vallenar', 'vallenar'),
  ((SELECT id FROM public.regions WHERE slug = 'atacama'), 'Alto del Carmen', 'alto-carmen'),
  ((SELECT id FROM public.regions WHERE slug = 'atacama'), 'Freirina', 'freirina'),
  ((SELECT id FROM public.regions WHERE slug = 'atacama'), 'Huasco', 'huasco'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'La Serena', 'la-serena'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Coquimbo', 'coquimbo'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Andacollo', 'andacollo'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'La Higuera', 'la-higuera'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Paiguano', 'paiguano'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Vicuña', 'vicuna'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Illapel', 'illapel'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Canela', 'canela'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Los Vilos', 'los-vilos'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Salamanca', 'salamanca'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Ovalle', 'ovalle'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Combarbalá', 'combarbala'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Monte Patria', 'monte-patria'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Punitaqui', 'punitaqui'),
  ((SELECT id FROM public.regions WHERE slug = 'coquimbo'), 'Río Hurtado', 'rio-hurtado'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Valparaíso', 'valparaiso'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Casablanca', 'casablanca'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Concón', 'concon'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Juan Fernández', 'juan-fernandez'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Puchuncaví', 'puchuncavi'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Quintero', 'quintero'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Viña del Mar', 'vina-del-mar'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Isla de Pascua', 'isla-pascua'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Los Andes', 'los-andes'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Calle Larga', 'calle-larga'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Rinconada', 'rinconada'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'San Esteban', 'san-esteban'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'La Ligua', 'la-ligua'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Cabildo', 'cabildo'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Papudo', 'papudo'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Petorca', 'petorca'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Zapallar', 'zapallar'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Quillota', 'quillota'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Calera', 'calera'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Hijuelas', 'hijuelas'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'La Cruz', 'la-cruz'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Nogales', 'nogales'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'San Antonio', 'san-antonio'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Algarrobo', 'algarrobo'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Cartagena', 'cartagena'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'El Quisco', 'el-quisco'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'El Tabo', 'el-tabo'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Santo Domingo', 'santo-domingo'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'San Felipe', 'san-felipe'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Catemu', 'catemu'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Llaillay', 'llaillay'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Panquehue', 'panquehue'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Putaendo', 'putaendo'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Santa María', 'santa-maria'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Limache', 'limache'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Quilpué', 'quilpue'),
  ((SELECT id FROM public.regions WHERE slug = 'valparaiso'), 'Villa Alemana', 'villa-alemana'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Santiago', 'santiago'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Cerrillos', 'cerrillos'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Cerro Navia', 'cerro-navia'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Conchalí', 'conchali'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'El Bosque', 'el-bosque'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Estación Central', 'estacion-central'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Huechuraba', 'huechuraba'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Independencia', 'independencia'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'La Cisterna', 'la-cisterna'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'La Florida', 'la-florida'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'La Granja', 'la-granja'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'La Pintana', 'la-pintana'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'La Reina', 'la-reina'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Las Condes', 'las-condes'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Lo Barnechea', 'lo-barnechea'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Lo Espejo', 'lo-espejo'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Lo Prado', 'lo-prado'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Macul', 'macul'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Maipú', 'maipu'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Ñuñoa', 'nunoa'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Pedro Aguirre Cerda', 'pedro-aguirre-cerda'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Peñalolén', 'penalolen'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Providencia', 'providencia'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Pudahuel', 'pudahuel'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Quilicura', 'quilicura'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Quinta Normal', 'quinta-normal'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Recoleta', 'recoleta'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Renca', 'renca'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'San Joaquín', 'san-joaquin'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'San Miguel', 'san-miguel'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'San Ramón', 'san-ramon'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Vitacura', 'vitacura'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Puente Alto', 'puente-alto'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Pirque', 'pirque'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'San José de Maipo', 'san-jose-maipo'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Colina', 'colina'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Lampa', 'lampa'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Tiltil', 'tiltil'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'San Bernardo', 'san-bernardo'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Buin', 'buin'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Calera de Tango', 'calera-tango'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Paine', 'paine'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Melipilla', 'melipilla'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Alhué', 'alhue'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Curacaví', 'curacavi'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'María Pinto', 'maria-pinto'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'San Pedro', 'san-pedro'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Talagante', 'talagante'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'El Monte', 'el-monte'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Isla de Maipo', 'isla-maipo'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Padre Hurtado', 'padre-hurtado'),
  ((SELECT id FROM public.regions WHERE slug = 'metropolitana'), 'Peñaflor', 'penaflor'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Rancagua', 'rancagua'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Codegua', 'codegua'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Coinco', 'coinco'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Coltauco', 'coltauco'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Doñihue', 'donihue'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Graneros', 'graneros'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Las Cabras', 'las-cabras'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Machalí', 'machali'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Malloa', 'malloa'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Mostazal', 'mostazal'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Olivar', 'olivar'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Peumo', 'peumo'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Pichidegua', 'pichidegua'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Quinta de Tilcoco', 'quinta-tilcoco'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Rengo', 'rengo'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Requínoa', 'requinoa'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'San Vicente', 'san-vicente'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Pichilemu', 'pichilemu'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'La Estrella', 'la-estrella'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Litueche', 'litueche'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Marchihue', 'marchihue'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Navidad', 'navidad'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Paredones', 'paredones'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'San Fernando', 'san-fernando'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Chépica', 'chepica'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Chimbarongo', 'chimbarongo'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Lolol', 'lolol'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Nancagua', 'nancagua'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Palmilla', 'palmilla'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Peralillo', 'peralillo'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Placilla', 'placilla'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Pumanque', 'pumanque'),
  ((SELECT id FROM public.regions WHERE slug = 'ohiggins'), 'Santa Cruz', 'santa-cruz'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Talca', 'talca'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Constitución', 'constitucion'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Curepto', 'curepto'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Empedrado', 'empedrado'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Maule', 'maule'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Pelarco', 'pelarco'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Pencahue', 'pencahue'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Río Claro', 'rio-claro'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'San Clemente', 'san-clemente'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'San Rafael', 'san-rafael'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Cauquenes', 'cauquenes'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Chanco', 'chanco'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Pelluhue', 'pelluhue'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Curicó', 'curico'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Hualañé', 'hualane'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Licantén', 'licanten'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Molina', 'molina'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Rauco', 'rauco'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Romeral', 'romeral'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Sagrada Familia', 'sagrada-familia'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Teno', 'teno'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Vichuquén', 'vichuquen'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Linares', 'linares'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Colbún', 'colbun'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Longaví', 'longavi'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Parral', 'parral'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Retiro', 'retiro'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'San Javier', 'san-javier'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Villa Alegre', 'villa-alegre'),
  ((SELECT id FROM public.regions WHERE slug = 'maule'), 'Yerbas Buenas', 'yerbas-buenas'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Chillán', 'chillan'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Bulnes', 'bulnes'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Chillán Viejo', 'chillan-viejo'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'El Carmen', 'el-carmen'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Pemuco', 'pemuco'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Pinto', 'pinto'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Quillón', 'quillon'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'San Ignacio', 'san-ignacio'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Yungay', 'yungay'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Coelemu', 'coelemu'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Coihueco', 'coihueco'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Ninhue', 'ninhue'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Portezuelo', 'portezuelo'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Quirihue', 'quirihue'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Ránquil', 'ranquil'),
  ((SELECT id FROM public.regions WHERE slug = 'nuble'), 'Treguaco', 'treguaco'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Concepción', 'concepcion'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Coronel', 'coronel'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Chiguayante', 'chiguayante'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Florida', 'florida'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Hualqui', 'hualqui'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Lota', 'lota'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Penco', 'penco'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'San Pedro de la Paz', 'san-pedro-paz'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Santa Juana', 'santa-juana'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Talcahuano', 'talcahuano'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Tomé', 'tome'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Hualpén', 'hualpen'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Lebu', 'lebu'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Arauco', 'arauco'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Cañete', 'canete'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Contulmo', 'contulmo'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Curanilahue', 'curanilahue'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Los Álamos', 'los-alamos'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Tirúa', 'tirua'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Los Ángeles', 'los-angeles'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Antuco', 'antuco'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Cabrero', 'cabrero'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Laja', 'laja'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Mulchén', 'mulchen'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Nacimiento', 'nacimiento'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Negrete', 'negrete'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Quilaco', 'quilaco'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Quilleco', 'quilleco'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'San Rosendo', 'san-rosendo'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Santa Bárbara', 'santa-barbara'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Tucapel', 'tucapel'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Yumbel', 'yumbel'),
  ((SELECT id FROM public.regions WHERE slug = 'biobio'), 'Alto Biobío', 'alto-biobio'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Temuco', 'temuco'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Carahue', 'carahue'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Cunco', 'cunco'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Curarrehue', 'curarrehue'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Freire', 'freire'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Galvarino', 'galvarino'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Gorbea', 'gorbea'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Lautaro', 'lautaro'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Loncoche', 'loncoche'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Melipeuco', 'melipeuco'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Nueva Imperial', 'nueva-imperial'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Padre las Casas', 'padre-las-casas'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Perquenco', 'perquenco'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Pitrufquén', 'pitrufquen'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Pucón', 'pucon'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Saavedra', 'saavedra'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Teodoro Schmidt', 'teodoro-schmidt'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Toltén', 'tolten'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Vilcún', 'vilcun'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Villarrica', 'villarrica'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Cholchol', 'cholchol'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Angol', 'angol'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Collipulli', 'collipulli'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Curacautín', 'curacautin'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Ercilla', 'ercilla'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Lonquimay', 'lonquimay'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Los Sauces', 'los-sauces'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Lumaco', 'lumaco'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Purén', 'puren'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Renaico', 'renaico'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Traiguén', 'traiguen'),
  ((SELECT id FROM public.regions WHERE slug = 'araucania'), 'Victoria', 'victoria'),
  ((SELECT id FROM public.regions WHERE slug = 'los-rios'), 'Valdivia', 'valdivia'),
  ((SELECT id FROM public.regions WHERE slug = 'los-rios'), 'Corral', 'corral'),
  ((SELECT id FROM public.regions WHERE slug = 'los-rios'), 'Lanco', 'lanco'),
  ((SELECT id FROM public.regions WHERE slug = 'los-rios'), 'Los Lagos', 'los-lagos'),
  ((SELECT id FROM public.regions WHERE slug = 'los-rios'), 'Máfil', 'mafil'),
  ((SELECT id FROM public.regions WHERE slug = 'los-rios'), 'Mariquina', 'mariquina'),
  ((SELECT id FROM public.regions WHERE slug = 'los-rios'), 'Paillaco', 'paillaco'),
  ((SELECT id FROM public.regions WHERE slug = 'los-rios'), 'Panguipulli', 'panguipulli'),
  ((SELECT id FROM public.regions WHERE slug = 'los-rios'), 'La Unión', 'la-union'),
  ((SELECT id FROM public.regions WHERE slug = 'los-rios'), 'Futrono', 'futrono'),
  ((SELECT id FROM public.regions WHERE slug = 'los-rios'), 'Lago Ranco', 'lago-ranco'),
  ((SELECT id FROM public.regions WHERE slug = 'los-rios'), 'Río Bueno', 'rio-bueno'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Puerto Montt', 'puerto-montt'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Calbuco', 'calbuco'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Cochamó', 'cochamo'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Fresia', 'fresia'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Frutillar', 'frutillar'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Los Muermos', 'los-muermos'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Llanquihue', 'llanquihue'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Maullín', 'maullin'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Puerto Varas', 'puerto-varas'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Castro', 'castro'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Ancud', 'ancud'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Chonchi', 'chonchi'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Curaco de Vélez', 'curaco-velez'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Dalcahue', 'dalcahue'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Puqueldón', 'puqueldon'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Queilén', 'queilen'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Quellón', 'quellon'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Quemchi', 'quemchi'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Quinchao', 'quinchao'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Osorno', 'osorno'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Puerto Octay', 'puerto-octay'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Purranque', 'purranque'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Puyehue', 'puyehue'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Río Negro', 'rio-negro'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'San Juan de la Costa', 'san-juan-costa'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'San Pablo', 'san-pablo'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Chaitén', 'chaiten'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Futaleufú', 'futaleufu'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Hualaihué', 'hualaihue'),
  ((SELECT id FROM public.regions WHERE slug = 'los-lagos'), 'Palena', 'palena'),
  ((SELECT id FROM public.regions WHERE slug = 'aysen'), 'Coyhaique', 'coyhaique'),
  ((SELECT id FROM public.regions WHERE slug = 'aysen'), 'Lago Verde', 'lago-verde'),
  ((SELECT id FROM public.regions WHERE slug = 'aysen'), 'Aysén', 'aysen'),
  ((SELECT id FROM public.regions WHERE slug = 'aysen'), 'Cisnes', 'cisnes'),
  ((SELECT id FROM public.regions WHERE slug = 'aysen'), 'Guaitecas', 'guaitecas'),
  ((SELECT id FROM public.regions WHERE slug = 'aysen'), 'Cochrane', 'cochrane'),
  ((SELECT id FROM public.regions WHERE slug = 'aysen'), 'O''Higgins', 'ohiggins-aysen'),
  ((SELECT id FROM public.regions WHERE slug = 'aysen'), 'Tortel', 'tortel'),
  ((SELECT id FROM public.regions WHERE slug = 'aysen'), 'Chile Chico', 'chile-chico'),
  ((SELECT id FROM public.regions WHERE slug = 'aysen'), 'Río Ibáñez', 'rio-ibanez'),
  ((SELECT id FROM public.regions WHERE slug = 'magallanes'), 'Punta Arenas', 'punta-arenas'),
  ((SELECT id FROM public.regions WHERE slug = 'magallanes'), 'Laguna Blanca', 'laguna-blanca'),
  ((SELECT id FROM public.regions WHERE slug = 'magallanes'), 'Río Verde', 'rio-verde'),
  ((SELECT id FROM public.regions WHERE slug = 'magallanes'), 'San Gregorio', 'san-gregorio'),
  ((SELECT id FROM public.regions WHERE slug = 'magallanes'), 'Cabo de Hornos', 'cabo-hornos'),
  ((SELECT id FROM public.regions WHERE slug = 'magallanes'), 'Antártica', 'antartica'),
  ((SELECT id FROM public.regions WHERE slug = 'magallanes'), 'Porvenir', 'porvenir'),
  ((SELECT id FROM public.regions WHERE slug = 'magallanes'), 'Primavera', 'primavera'),
  ((SELECT id FROM public.regions WHERE slug = 'magallanes'), 'Timaukel', 'timaukel'),
  ((SELECT id FROM public.regions WHERE slug = 'magallanes'), 'Natales', 'natales'),
  ((SELECT id FROM public.regions WHERE slug = 'magallanes'), 'Torres del Paine', 'torres-paine')
ON CONFLICT (region_id, name) DO NOTHING;

-- Insertar marcas y modelos de vehículos
DO $$
DECLARE
  toyota_id UUID;
  honda_id UUID;
  ford_id UUID;
  chevrolet_id UUID;
  nissan_id UUID;
  hyundai_id UUID;
  kia_id UUID;
  mazda_id UUID;
  subaru_id UUID;
  volkswagen_id UUID;
  bmw_id UUID;
  mercedes_id UUID;
  audi_id UUID;
  porsche_id UUID;
  ferrari_id UUID;
  lamborghini_id UUID;
  mclaren_id UUID;
  bugatti_id UUID;
  koenigsegg_id UUID;
  pagani_id UUID;
  aston_martin_id UUID;
  bentley_id UUID;
  rolls_royce_id UUID;
  jaguar_id UUID;
  land_rover_id UUID;
BEGIN
  -- Insertar marcas
  INSERT INTO public.brands (name, slug, active) VALUES
    ('Toyota', 'toyota', true),
    ('Honda', 'honda', true),
    ('Ford', 'ford', true),
    ('Chevrolet', 'chevrolet', true),
    ('Nissan', 'nissan', true),
    ('Hyundai', 'hyundai', true),
    ('Kia', 'kia', true),
    ('Mazda', 'mazda', true),
    ('Subaru', 'subaru', true),
    ('Volkswagen', 'volkswagen', true),
    ('BMW', 'bmw', true),
    ('Mercedes-Benz', 'mercedes-benz', true),
    ('Audi', 'audi', true),
    ('Porsche', 'porsche', true),
    ('Ferrari', 'ferrari', true),
    ('Lamborghini', 'lamborghini', true),
    ('McLaren', 'mclaren', true),
    ('Bugatti', 'bugatti', true),
    ('Koenigsegg', 'koenigsegg', true),
    ('Pagani', 'pagani', true),
    ('Aston Martin', 'aston-martin', true),
    ('Bentley', 'bentley', true),
    ('Rolls-Royce', 'rolls-royce', true),
    ('Jaguar', 'jaguar', true),
    ('Land Rover', 'land-rover', true)
  ON CONFLICT (name) DO NOTHING;

  -- Obtener IDs de marcas
  SELECT id INTO toyota_id FROM public.brands WHERE name = 'Toyota';
  SELECT id INTO honda_id FROM public.brands WHERE name = 'Honda';
  SELECT id INTO ford_id FROM public.brands WHERE name = 'Ford';
  SELECT id INTO chevrolet_id FROM public.brands WHERE name = 'Chevrolet';
  SELECT id INTO nissan_id FROM public.brands WHERE name = 'Nissan';
  SELECT id INTO hyundai_id FROM public.brands WHERE name = 'Hyundai';
  SELECT id INTO kia_id FROM public.brands WHERE name = 'Kia';
  SELECT id INTO mazda_id FROM public.brands WHERE name = 'Mazda';
  SELECT id INTO subaru_id FROM public.brands WHERE name = 'Subaru';
  SELECT id INTO volkswagen_id FROM public.brands WHERE name = 'Volkswagen';
  SELECT id INTO bmw_id FROM public.brands WHERE name = 'BMW';
  SELECT id INTO mercedes_id FROM public.brands WHERE name = 'Mercedes-Benz';
  SELECT id INTO audi_id FROM public.brands WHERE name = 'Audi';
  SELECT id INTO porsche_id FROM public.brands WHERE name = 'Porsche';
  SELECT id INTO ferrari_id FROM public.brands WHERE name = 'Ferrari';
  SELECT id INTO lamborghini_id FROM public.brands WHERE name = 'Lamborghini';
  SELECT id INTO mclaren_id FROM public.brands WHERE name = 'McLaren';
  SELECT id INTO bugatti_id FROM public.brands WHERE name = 'Bugatti';
  SELECT id INTO koenigsegg_id FROM public.brands WHERE name = 'Koenigsegg';
  SELECT id INTO pagani_id FROM public.brands WHERE name = 'Pagani';
  SELECT id INTO aston_martin_id FROM public.brands WHERE name = 'Aston Martin';
  SELECT id INTO bentley_id FROM public.brands WHERE name = 'Bentley';
  SELECT id INTO rolls_royce_id FROM public.brands WHERE name = 'Rolls-Royce';
  SELECT id INTO jaguar_id FROM public.brands WHERE name = 'Jaguar';
  SELECT id INTO land_rover_id FROM public.brands WHERE name = 'Land Rover';

  -- Insertar modelos para Toyota
  IF toyota_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (toyota_id, 'Corolla', true),
      (toyota_id, 'Camry', true),
      (toyota_id, 'RAV4', true),
      (toyota_id, 'Prius', true),
      (toyota_id, 'Highlander', true),
      (toyota_id, 'Tacoma', true),
      (toyota_id, 'Tundra', true),
      (toyota_id, '4Runner', true),
      (toyota_id, 'Land Cruiser', true),
      (toyota_id, 'Sequoia', true),
      (toyota_id, 'Sienna', true),
      (toyota_id, 'Yaris', true),
      (toyota_id, 'Avalon', true),
      (toyota_id, 'C-HR', true),
      (toyota_id, 'Venza', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Honda
  IF honda_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (honda_id, 'Civic', true),
      (honda_id, 'Accord', true),
      (honda_id, 'CR-V', true),
      (honda_id, 'Pilot', true),
      (honda_id, 'HR-V', true),
      (honda_id, 'Fit', true),
      (honda_id, 'Odyssey', true),
      (honda_id, 'Ridgeline', true),
      (honda_id, 'Passport', true),
      (honda_id, 'Insight', true),
      (honda_id, 'Clarity', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Ford
  IF ford_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (ford_id, 'F-150', true),
      (ford_id, 'F-250', true),
      (ford_id, 'F-350', true),
      (ford_id, 'Explorer', true),
      (ford_id, 'Escape', true),
      (ford_id, 'Edge', true),
      (ford_id, 'Mustang', true),
      (ford_id, 'Focus', true),
      (ford_id, 'Fusion', true),
      (ford_id, 'Taurus', true),
      (ford_id, 'Expedition', true),
      (ford_id, 'Ranger', true),
      (ford_id, 'Bronco', true),
      (ford_id, 'Maverick', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Chevrolet
  IF chevrolet_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (chevrolet_id, 'Silverado', true),
      (chevrolet_id, 'Colorado', true),
      (chevrolet_id, 'Equinox', true),
      (chevrolet_id, 'Traverse', true),
      (chevrolet_id, 'Tahoe', true),
      (chevrolet_id, 'Suburban', true),
      (chevrolet_id, 'Malibu', true),
      (chevrolet_id, 'Impala', true),
      (chevrolet_id, 'Cruze', true),
      (chevrolet_id, 'Volt', true),
      (chevrolet_id, 'Bolt', true),
      (chevrolet_id, 'Camaro', true),
      (chevrolet_id, 'Corvette', true),
      (chevrolet_id, 'Blazer', true),
      (chevrolet_id, 'Trailblazer', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Nissan
  IF nissan_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (nissan_id, 'Altima', true),
      (nissan_id, 'Sentra', true),
      (nissan_id, 'Versa', true),
      (nissan_id, 'Maxima', true),
      (nissan_id, 'Rogue', true),
      (nissan_id, 'Murano', true),
      (nissan_id, 'Pathfinder', true),
      (nissan_id, 'Armada', true),
      (nissan_id, 'Titan', true),
      (nissan_id, 'Frontier', true),
      (nissan_id, '370Z', true),
      (nissan_id, 'GT-R', true),
      (nissan_id, 'Kicks', true),
      (nissan_id, 'Juke', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Hyundai
  IF hyundai_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (hyundai_id, 'Elantra', true),
      (hyundai_id, 'Sonata', true),
      (hyundai_id, 'Accent', true),
      (hyundai_id, 'Tucson', true),
      (hyundai_id, 'Santa Fe', true),
      (hyundai_id, 'Palisade', true),
      (hyundai_id, 'Kona', true),
      (hyundai_id, 'Venue', true),
      (hyundai_id, 'Nexo', true),
      (hyundai_id, 'Ioniq', true),
      (hyundai_id, 'Veloster', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Kia
  IF kia_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (kia_id, 'Rio', true),
      (kia_id, 'Forte', true),
      (kia_id, 'Optima', true),
      (kia_id, 'Stinger', true),
      (kia_id, 'Soul', true),
      (kia_id, 'Sportage', true),
      (kia_id, 'Sorento', true),
      (kia_id, 'Telluride', true),
      (kia_id, 'Seltos', true),
      (kia_id, 'Niro', true),
      (kia_id, 'Carnival', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Mazda
  IF mazda_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (mazda_id, 'Mazda3', true),
      (mazda_id, 'Mazda6', true),
      (mazda_id, 'CX-3', true),
      (mazda_id, 'CX-30', true),
      (mazda_id, 'CX-5', true),
      (mazda_id, 'CX-9', true),
      (mazda_id, 'MX-5 Miata', true),
      (mazda_id, 'MX-30', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Subaru
  IF subaru_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (subaru_id, 'Impreza', true),
      (subaru_id, 'Legacy', true),
      (subaru_id, 'Outback', true),
      (subaru_id, 'Forester', true),
      (subaru_id, 'Crosstrek', true),
      (subaru_id, 'Ascent', true),
      (subaru_id, 'WRX', true),
      (subaru_id, 'BRZ', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Volkswagen
  IF volkswagen_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (volkswagen_id, 'Jetta', true),
      (volkswagen_id, 'Passat', true),
      (volkswagen_id, 'Arteon', true),
      (volkswagen_id, 'Golf', true),
      (volkswagen_id, 'Tiguan', true),
      (volkswagen_id, 'Atlas', true),
      (volkswagen_id, 'Touareg', true),
      (volkswagen_id, 'ID.4', true),
      (volkswagen_id, 'ID.3', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para BMW
  IF bmw_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (bmw_id, '3 Series', true),
      (bmw_id, '5 Series', true),
      (bmw_id, '7 Series', true),
      (bmw_id, 'X3', true),
      (bmw_id, 'X5', true),
      (bmw_id, 'X7', true),
      (bmw_id, 'i3', true),
      (bmw_id, 'i8', true),
      (bmw_id, 'M3', true),
      (bmw_id, 'M5', true),
      (bmw_id, 'Z4', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Mercedes-Benz
  IF mercedes_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (mercedes_id, 'C-Class', true),
      (mercedes_id, 'E-Class', true),
      (mercedes_id, 'S-Class', true),
      (mercedes_id, 'A-Class', true),
      (mercedes_id, 'CLA', true),
      (mercedes_id, 'GLC', true),
      (mercedes_id, 'GLE', true),
      (mercedes_id, 'GLS', true),
      (mercedes_id, 'G-Class', true),
      (mercedes_id, 'SL', true),
      (mercedes_id, 'SLC', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Audi
  IF audi_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (audi_id, 'A3', true),
      (audi_id, 'A4', true),
      (audi_id, 'A6', true),
      (audi_id, 'A8', true),
      (audi_id, 'Q3', true),
      (audi_id, 'Q5', true),
      (audi_id, 'Q7', true),
      (audi_id, 'Q8', true),
      (audi_id, 'TT', true),
      (audi_id, 'R8', true),
      (audi_id, 'e-tron', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Porsche
  IF porsche_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (porsche_id, '911', true),
      (porsche_id, 'Cayenne', true),
      (porsche_id, 'Macan', true),
      (porsche_id, 'Panamera', true),
      (porsche_id, 'Taycan', true),
      (porsche_id, 'Boxster', true),
      (porsche_id, 'Cayman', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Ferrari
  IF ferrari_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (ferrari_id, '488', true),
      (ferrari_id, '812', true),
      (ferrari_id, 'F8', true),
      (ferrari_id, 'SF90', true),
      (ferrari_id, 'Roma', true),
      (ferrari_id, 'Portofino', true),
      (ferrari_id, 'California', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Lamborghini
  IF lamborghini_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (lamborghini_id, 'Huracán', true),
      (lamborghini_id, 'Aventador', true),
      (lamborghini_id, 'Urus', true),
      (lamborghini_id, 'Gallardo', true),
      (lamborghini_id, 'Murciélago', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para McLaren
  IF mclaren_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (mclaren_id, '720S', true),
      (mclaren_id, '570S', true),
      (mclaren_id, '600LT', true),
      (mclaren_id, 'GT', true),
      (mclaren_id, 'Artura', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Bugatti
  IF bugatti_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (bugatti_id, 'Chiron', true),
      (bugatti_id, 'Divo', true),
      (bugatti_id, 'Centodieci', true),
      (bugatti_id, 'La Voiture Noire', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Koenigsegg
  IF koenigsegg_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (koenigsegg_id, 'Agera', true),
      (koenigsegg_id, 'Regera', true),
      (koenigsegg_id, 'Jesko', true),
      (koenigsegg_id, 'Gemera', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Pagani
  IF pagani_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (pagani_id, 'Huayra', true),
      (pagani_id, 'Zonda', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Aston Martin
  IF aston_martin_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (aston_martin_id, 'DB11', true),
      (aston_martin_id, 'Vantage', true),
      (aston_martin_id, 'DBS', true),
      (aston_martin_id, 'Rapide', true),
      (aston_martin_id, 'Valhalla', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Bentley
  IF bentley_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (bentley_id, 'Continental GT', true),
      (bentley_id, 'Bentayga', true),
      (bentley_id, 'Flying Spur', true),
      (bentley_id, 'Mulsanne', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Rolls-Royce
  IF rolls_royce_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (rolls_royce_id, 'Ghost', true),
      (rolls_royce_id, 'Dawn', true),
      (rolls_royce_id, 'Wraith', true),
      (rolls_royce_id, 'Cullinan', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Jaguar
  IF jaguar_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (jaguar_id, 'XE', true),
      (jaguar_id, 'XF', true),
      (jaguar_id, 'XJ', true),
      (jaguar_id, 'F-PACE', true),
      (jaguar_id, 'E-PACE', true),
      (jaguar_id, 'I-PACE', true),
      (jaguar_id, 'F-TYPE', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

  -- Insertar modelos para Land Rover
  IF land_rover_id IS NOT NULL THEN
    INSERT INTO public.models (brand_id, name, active) VALUES
      (land_rover_id, 'Range Rover', true),
      (land_rover_id, 'Discovery', true),
      (land_rover_id, 'Defender', true),
      (land_rover_id, 'Evoque', true),
      (land_rover_id, 'Velar', true)
    ON CONFLICT (brand_id, name) DO NOTHING;
  END IF;

END $$;

/*
============================
 12. ÍNDICES PARA OPTIMIZACIÓN
============================
*/
-- Índices para vehicle_metrics
CREATE INDEX IF NOT EXISTS idx_vehicle_metrics_views ON public.vehicle_metrics(views DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_metrics_updated ON public.vehicle_metrics(updated_at DESC);

-- Índices para vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_status ON public.vehicles(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type_status ON public.vehicles(type_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_published_at ON public.vehicles(published_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_featured ON public.vehicles(featured) WHERE featured = true;

-- Índices para vehicle_boosts
CREATE INDEX IF NOT EXISTS idx_vehicle_boosts_vehicle_status ON public.vehicle_boosts(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_boosts_end_date ON public.vehicle_boosts(end_date);

/*
============================
 13. DOCUMENTACIÓN FINAL
============================
*/
-- RESUMEN DEL ESQUEMA CONSOLIDADO:
--
-- TABLAS PRINCIPALES:
-- - profiles: Perfiles de usuarios
-- - companies: Empresas
-- - vehicles: Vehículos publicados
-- - vehicle_metrics: Métricas de visualización de vehículos
-- - vehicle_media: Imágenes y videos de vehículos
-- - vehicle_features: Características específicas
-- - commercial_conditions: Condiciones de venta/alquiler/subasta
--
-- SISTEMA DE BOOSTS:
-- - boost_plans: Planes disponibles
-- - vehicle_boosts: Boosts activos
-- - vehicle_boost_slots: Posiciones diarias
-- - boost_daily_stats: Estadísticas diarias
--
-- PAGOS Y SUSCRIPCIONES:
-- - payments: Pagos realizados
-- - subscriptions: Suscripciones activas
-- - invoices: Facturas
--
-- OTROS:
-- - notifications: Notificaciones de usuario
-- - vehicle_sales: Ventas completadas
--
-- FUNCIONES:
-- - increment_vehicle_metric(): Incrementa métricas de vehículos
-- - update_updated_at_column(): Actualiza timestamps automáticamente
--
-- POLÍTICAS RLS: Implementadas en todas las tablas para seguridad
-- DATOS INICIALES: Regiones, tipos de vehículo, planes de boost, comunas chilenas y marcas/modelos incluidos
--
-- Este archivo representa el estado final y completo de la base de datos.
-- Todas las migraciones anteriores han sido consolidadas aquí.