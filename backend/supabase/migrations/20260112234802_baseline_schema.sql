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
-- Source migration: 20251114000000_complete_backend_migration.sql
-- =====================================================================
-- ============================================================
-- MIGRACIÓN COMPLETA - SIMPLE ECOSISTEMA
-- Esquema unificado multi-vertical con perfiles personales y de empresa
-- Fecha: 13 de diciembre de 2025
-- Contiene todo el backend: tipos, tablas, funciones, RLS y storage
-- ============================================================

/*
=============================================================
0. LIMPIEZA COMPLETA DEL BACKEND ANTERIOR
=============================================================
*/

-- Deshabilitar RLS temporalmente para evitar conflictos en DROP
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN ('schema_migrations')
    LOOP
        EXECUTE 'ALTER TABLE public.' || tbl.tablename || ' DISABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- Eliminar todas las tablas conocidas (orden inverso de dependencias)
DROP TABLE IF EXISTS public.public_profile_verticals CASCADE;
DROP TABLE IF EXISTS public.special_schedules CASCADE;
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.profile_addresses CASCADE;
DROP TABLE IF EXISTS public.sso_tokens CASCADE;
DROP TABLE IF EXISTS public.user_verticals CASCADE;
DROP TABLE IF EXISTS public.listing_boost_slots CASCADE;
DROP TABLE IF EXISTS public.listing_boosts CASCADE;
DROP TABLE IF EXISTS public.boost_slots CASCADE;
DROP TABLE IF EXISTS public.listing_metrics CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.images CASCADE;
DROP TABLE IF EXISTS public.listings_properties CASCADE;
DROP TABLE IF EXISTS public.listings_vehicles CASCADE;
DROP TABLE IF EXISTS public.listings CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
DROP TABLE IF EXISTS public.company_users CASCADE;
DROP TABLE IF EXISTS public.company_profiles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.individual_profiles CASCADE;
DROP TABLE IF EXISTS public.public_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.models CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.vehicle_types CASCADE;
DROP TABLE IF EXISTS public.communes CASCADE;
DROP TABLE IF EXISTS public.regions CASCADE;
DROP TABLE IF EXISTS public.verticals CASCADE;

-- Eliminar vistas
DROP VIEW IF EXISTS public.properties_detailed CASCADE;
DROP VIEW IF EXISTS public.vehicles_detailed CASCADE;
DROP VIEW IF EXISTS public.popular_vehicle_types CASCADE;
DROP VIEW IF EXISTS public.vehicle_subcategories_flat CASCADE;
DROP VIEW IF EXISTS public.social_links CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_listing_tsv() CASCADE;
DROP FUNCTION IF EXISTS public.increment_listing_metric(uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.increment_listing_views(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_active_subscription(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_plan_limits(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_plan() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_company_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_company_owner(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_company_owner() CASCADE;
DROP FUNCTION IF EXISTS public.create_company_with_owner(jsonb, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_listing_featured_state(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.on_listing_boost_slots_change() CASCADE;
DROP FUNCTION IF EXISTS public.generate_sso_token(uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.init_sso_token(text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.validate_sso_token(text, text) CASCADE;

-- Eliminar tipos
DROP TYPE IF EXISTS public.user_type CASCADE;
DROP TYPE IF EXISTS public.public_profile_type CASCADE;
DROP TYPE IF EXISTS public.listing_status CASCADE;
DROP TYPE IF EXISTS public.vehicle_body_type CASCADE;
DROP TYPE IF EXISTS public.vehicle_condition CASCADE;
DROP TYPE IF EXISTS public.vehicle_state CASCADE;
DROP TYPE IF EXISTS public.vehicle_fuel_type CASCADE;
DROP TYPE IF EXISTS public.vehicle_transmission CASCADE;
DROP TYPE IF EXISTS public.vehicle_traction CASCADE;
DROP TYPE IF EXISTS public.company_user_role CASCADE;
DROP TYPE IF EXISTS public.profile_document_type CASCADE;
DROP TYPE IF EXISTS public.profile_address_type CASCADE;

/*
=============================================================
1. TIPOS Y ENUMS
=============================================================
*/

CREATE TYPE public.user_type AS ENUM ('individual', 'company');
CREATE TYPE public.public_profile_type AS ENUM ('business', 'individual', 'company');
CREATE TYPE public.company_user_role AS ENUM ('owner', 'admin', 'member', 'seller', 'viewer');
CREATE TYPE public.listing_status AS ENUM ('draft', 'published', 'sold', 'inactive');
CREATE TYPE public.profile_document_type AS ENUM ('run','dni','passport','other');
CREATE TYPE public.profile_address_type AS ENUM ('home','billing','shipping','other');

CREATE TYPE public.vehicle_body_type AS ENUM (
    'sedan','hatchback','coupe','suv','pickup','convertible','wagon','van','crossover','moto','camion'
);

CREATE TYPE public.vehicle_condition AS ENUM (
    'nuevo','demo','seminuevo','usado','certificado','restaurado','siniestrado','para-reparar','para-repuestos'
);

CREATE TYPE public.vehicle_state AS ENUM (
    'excelente','bueno','regular','malo'
);

CREATE TYPE public.vehicle_fuel_type AS ENUM (
    'gasolina','diesel','electrico','hibrido','gas_lp','gas_natural'
);

CREATE TYPE public.vehicle_transmission AS ENUM (
    'manual','automatica'
);

CREATE TYPE public.vehicle_traction AS ENUM (
    '4x2','4x4','awd','fwd','rwd'
);

/*
=============================================================
2. TABLAS BASE: GEOGRAFÍA Y CATÁLOGOS
=============================================================
*/

CREATE TABLE public.regions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    code text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.communes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    region_id uuid REFERENCES public.regions(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(name, region_id)
);

CREATE TABLE public.verticals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    key text NOT NULL UNIQUE,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.vehicle_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    category text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.brands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    logo_url text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
    name text NOT NULL,
    vehicle_type_id uuid REFERENCES public.vehicle_types(id),
    year_from integer,
    year_to integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(brand_id, name)
);

/*
=============================================================
3. CUENTAS Y PERFILES
=============================================================
*/

-- Cuenta base (datos privados, 1:1 con auth.users)
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    first_name text,
    last_name text,
    phone text,
    whatsapp text,
    locale text DEFAULT 'es-CL',
    timezone text DEFAULT 'America/Santiago',
    preferences jsonb DEFAULT '{}'::jsonb,
    default_vertical text,
    user_type public.user_type DEFAULT 'individual',
    plan_key text DEFAULT 'free',
    onboarding_status text DEFAULT 'pending',
    is_staff boolean DEFAULT false,
    document_type public.profile_document_type,
    document_number text,
    birth_date date,
    gender text,
    nationality text,
    region_id uuid REFERENCES public.regions(id),
    commune_id uuid REFERENCES public.communes(id),
    user_role text,
    selected_public_mode text NOT NULL DEFAULT 'individual' CHECK (selected_public_mode IN ('individual','company')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Cuenta administrativa privada de empresa
CREATE TABLE public.companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    legal_name text,
    rut text,
    billing_email text,
    billing_phone text,
    address_legal text,
    region_id uuid REFERENCES public.regions(id),
    commune_id uuid REFERENCES public.communes(id),
    industry text,
    company_type text,
    billing_data jsonb DEFAULT '{}'::jsonb,
    plan_key text DEFAULT 'free',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Perfil público unificado (persona o empresa)
CREATE TABLE public.public_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    profile_type public.public_profile_type NOT NULL DEFAULT 'business',
    company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    slug text NOT NULL UNIQUE,
    public_name text,
    headline text,
    bio text,
    profession text,
    avatar_url text,
    cover_url text,
    website text,
    contact_email text,
    contact_phone text,
    whatsapp text,
    whatsapp_type text,
    facebook text,
    instagram text,
    linkedin text,
    tiktok text,
    twitter text,
    youtube text,
    region_id uuid REFERENCES public.regions(id),
    commune_id uuid REFERENCES public.communes(id),
    address text,
    preferences jsonb DEFAULT '{}'::jsonb,
    is_public boolean DEFAULT true,
    verification_status text DEFAULT 'pending',
    rating numeric(3,2) DEFAULT 0,
    review_count integer DEFAULT 0,
    visits integer DEFAULT 0,
    business_kind text,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
    ,CONSTRAINT public_profiles_business_kind_check CHECK (business_kind IS NULL OR business_kind IN ('independent','company'))
    ,CONSTRAINT public_profiles_status_check CHECK (status IN ('draft','active','suspended'))
);

-- Relación usuario-empresa (miembros y roles)
CREATE TABLE public.company_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.company_user_role DEFAULT 'member',
    permissions jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active',
    joined_at timestamptz DEFAULT now(),
    UNIQUE(company_id, user_id)
);

/*
=============================================================
4. SUBSCRIPCIONES Y PLANES
=============================================================
*/

CREATE TABLE public.subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_key text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    vertical_id uuid REFERENCES public.verticals(id) ON DELETE SET NULL,
    target_type text NOT NULL DEFAULT 'both', -- individual | company | both
    limits jsonb DEFAULT '{}'::jsonb,
    features jsonb DEFAULT '{}'::jsonb,
    price_monthly numeric(12,2) NOT NULL DEFAULT 0,
    price_yearly numeric(12,2),
    currency text DEFAULT 'CLP',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    target_type text NOT NULL DEFAULT 'individual',
    status text DEFAULT 'active',
    current_period_start timestamptz DEFAULT now(),
    current_period_end timestamptz,
    cancel_at_period_end boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT subscription_target_check CHECK (
        (user_id IS NOT NULL AND company_id IS NULL AND target_type IN ('individual','both')) OR
        (company_id IS NOT NULL AND user_id IS NULL AND target_type IN ('company','both'))
    )
);

CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'CLP',
    status text NOT NULL,
    payment_method text,
    external_id text,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

/*
=============================================================
5. LISTINGS MULTI-VERTICAL
=============================================================
*/

CREATE TABLE public.listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id uuid NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
    public_profile_id uuid REFERENCES public.public_profiles(id) ON DELETE SET NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status public.listing_status DEFAULT 'draft',
    listing_type text NOT NULL,
    title text NOT NULL,
    description text,
    price numeric(15,2),
    currency text DEFAULT 'CLP',
    views integer DEFAULT 0,
    published_at timestamptz,
    expires_at timestamptz,
    featured_until timestamptz,
    is_featured boolean DEFAULT false,
    is_urgent boolean DEFAULT false,
    contact_phone text,
    contact_email text,
    contact_whatsapp text,
    location text,
    ubicacion_mapa text,
    region_id uuid REFERENCES public.regions(id),
    commune_id uuid REFERENCES public.communes(id),
    tags text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    search_vector tsvector,
    visibility text DEFAULT 'normal',
    allow_financing boolean DEFAULT false,
    allow_exchange boolean DEFAULT false,
    rent_daily_price numeric(15,2),
    rent_weekly_price numeric(15,2),
    rent_monthly_price numeric(15,2),
    rent_security_deposit numeric(15,2),
    auction_start_price numeric(15,2),
    auction_start_at timestamptz,
    auction_end_at timestamptz,
    video_url text,
    document_urls text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT listings_visibility_check CHECK (visibility IN ('normal','featured','hidden')),
    CONSTRAINT listings_owner_check CHECK (public_profile_id IS NOT NULL)
);

CREATE TABLE public.listings_vehicles (
    listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
    vehicle_type_id uuid REFERENCES public.vehicle_types(id) ON DELETE SET NULL,
    brand_id uuid REFERENCES public.brands(id),
    model_id uuid REFERENCES public.models(id),
    year integer,
    mileage integer,
    transmission public.vehicle_transmission,
    fuel_type public.vehicle_fuel_type,
    traction public.vehicle_traction,
    engine_size text,
    color text,
    body_type public.vehicle_body_type,
    doors integer,
    seats integer,
    license_plate text,
    vin text,
    features jsonb DEFAULT '[]'::jsonb,
    condition public.vehicle_condition,
    state public.vehicle_state,
    warranty boolean DEFAULT false,
    warranty_details text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.listings_properties (
    listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
    property_type text,
    operation_type text,
    bedrooms integer,
    bathrooms integer,
    parking_spaces integer,
    total_area numeric(10,2),
    built_area numeric(10,2),
    land_area numeric(10,2),
    floor integer,
    building_floors integer,
    year_built integer,
    orientation text,
    condition text,
    furnished boolean DEFAULT false,
    pet_friendly boolean DEFAULT false,
    features jsonb DEFAULT '[]'::jsonb,
    amenities jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

/*
=============================================================
6. CONTENIDO MULTIMEDIA
=============================================================
*/

CREATE TABLE public.images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
    url text NOT NULL,
    alt_text text,
    caption text,
    position integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    url text NOT NULL,
    file_type text,
    file_size integer,
    created_at timestamptz DEFAULT now()
);

/*
=============================================================
7. INTERACCIÓN SOCIAL
=============================================================
*/

CREATE TABLE public.favorites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, listing_id)
);

CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
    subject text,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    content text,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewed_profile_id uuid REFERENCES public.public_profiles(id) ON DELETE CASCADE,
    listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title text,
    comment text,
    is_public boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

/*
=============================================================
8. MÉTRICAS
=============================================================
*/

CREATE TABLE public.listing_metrics (
    listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
    views integer NOT NULL DEFAULT 0,
    clicks integer NOT NULL DEFAULT 0,
    favorites integer NOT NULL DEFAULT 0,
    shares integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

/*
=============================================================
9. BOOSTS
=============================================================
*/

CREATE TABLE public.boost_slots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id uuid NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
    key text NOT NULL,
    title text NOT NULL,
    description text,
    placement text,
    max_active integer DEFAULT 10,
    default_duration_days integer DEFAULT 7,
    price numeric(12,2),
    currency text DEFAULT 'CLP',
    is_active boolean DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(vertical_id, key)
);

CREATE TABLE public.listing_boosts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending',
    starts_at timestamptz,
    ends_at timestamptz,
    payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
    payment_amount numeric(12,2),
    payment_currency text DEFAULT 'CLP',
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.listing_boost_slots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    boost_id uuid NOT NULL REFERENCES public.listing_boosts(id) ON DELETE CASCADE,
    slot_id uuid NOT NULL REFERENCES public.boost_slots(id) ON DELETE CASCADE,
    listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    priority integer DEFAULT 0,
    starts_at timestamptz,
    ends_at timestamptz,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

/*
=============================================================
10. ACCESO MULTI-VERTICAL Y SSO
=============================================================
*/

CREATE TABLE public.user_verticals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vertical text NOT NULL,
    permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, vertical)
);

-- Direcciones por perfil
CREATE TABLE public.profile_addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type public.profile_address_type DEFAULT 'home',
    label text,
    line1 text NOT NULL,
    line2 text,
    country text,
    region_id uuid REFERENCES public.regions(id),
    commune_id uuid REFERENCES public.communes(id),
    postal_code text,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Horarios públicos por perfil
CREATE TABLE public.schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    public_profile_id uuid NOT NULL REFERENCES public.public_profiles(id) ON DELETE CASCADE,
    weekday text NOT NULL,
    start_time text,
    end_time text,
    closed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(public_profile_id, weekday)
);

CREATE TABLE public.special_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    public_profile_id uuid NOT NULL REFERENCES public.public_profiles(id) ON DELETE CASCADE,
    date date NOT NULL,
    start_time text,
    end_time text,
    closed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(public_profile_id, date)
);

-- Asignaciones de vertical por perfil público
CREATE TABLE public.public_profile_verticals (
    public_profile_id uuid NOT NULL REFERENCES public.public_profiles(id) ON DELETE CASCADE,
    vertical_key text NOT NULL REFERENCES public.verticals(key) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (public_profile_id, vertical_key)
);

CREATE TABLE public.sso_tokens (
    token text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_domain text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

/*
=============================================================
11. FUNCIONES Y TRIGGERS
=============================================================
*/

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_listing_tsv()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('spanish', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('spanish', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('spanish', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.increment_listing_metric(
    p_listing_id uuid,
    p_metric text,
    p_amount integer DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_metric NOT IN ('views','clicks','favorites','shares') THEN
        RAISE EXCEPTION 'Invalid metric: %', p_metric;
    END IF;

    INSERT INTO public.listing_metrics (listing_id, views, clicks, favorites, shares, created_at, updated_at)
    VALUES (
        p_listing_id,
        CASE WHEN p_metric = 'views' THEN p_amount ELSE 0 END,
        CASE WHEN p_metric = 'clicks' THEN p_amount ELSE 0 END,
        CASE WHEN p_metric = 'favorites' THEN p_amount ELSE 0 END,
        CASE WHEN p_metric = 'shares' THEN p_amount ELSE 0 END,
        now(), now()
    )
    ON CONFLICT (listing_id) DO UPDATE
    SET
        views = public.listing_metrics.views + (CASE WHEN p_metric = 'views' THEN p_amount ELSE 0 END),
        clicks = public.listing_metrics.clicks + (CASE WHEN p_metric = 'clicks' THEN p_amount ELSE 0 END),
        favorites = public.listing_metrics.favorites + (CASE WHEN p_metric = 'favorites' THEN p_amount ELSE 0 END),
        shares = public.listing_metrics.shares + (CASE WHEN p_metric = 'shares' THEN p_amount ELSE 0 END),
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user uuid, required_plan text DEFAULT 'pro')
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.subscriptions s
        JOIN public.subscription_plans p ON p.id = s.plan_id
        WHERE s.user_id = p_user
          AND s.status = 'active'
          AND (s.current_period_end IS NULL OR s.current_period_end > now())
          AND p.plan_key IN (required_plan, 'premium', 'enterprise', 'pro')
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user uuid)
RETURNS TABLE (
    max_listings integer,
    max_featured_listings integer,
    max_images_per_listing integer,
    can_use_boost boolean,
    can_use_analytics boolean
) AS $$
DECLARE
    limits jsonb;
BEGIN
    SELECT p.limits
    INTO limits
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.user_id = p_user
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
    ORDER BY COALESCE(p.price_monthly,0) DESC
    LIMIT 1;

    IF limits IS NULL THEN
        RETURN QUERY SELECT 5, 0, 5, false, false;
    ELSE
        RETURN QUERY SELECT
            COALESCE((limits->>'max_listings')::int, 5),
            COALESCE((limits->>'max_featured')::int, 0),
            COALESCE((limits->>'max_images')::int, 5),
            COALESCE((limits->>'can_use_boost')::boolean, false),
            COALESCE((limits->>'can_use_analytics')::boolean, false);
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_profile_plan()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_key text;
BEGIN
    SELECT plan_key INTO v_plan_key FROM public.subscription_plans WHERE id = NEW.plan_id;

    IF NEW.user_id IS NOT NULL THEN
        UPDATE public.profiles SET plan_key = v_plan_key WHERE id = NEW.user_id;
    ELSIF NEW.company_id IS NOT NULL THEN
        UPDATE public.companies SET plan_key = v_plan_key WHERE id = NEW.company_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_company_member(company uuid, uid uuid)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS(
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = company AND cu.user_id = uid AND cu.status = 'active'
            AND cu.role IN ('owner','admin','seller','member')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_company_owner(company uuid, uid uuid)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS(
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = company AND cu.user_id = uid AND cu.role = 'owner'
    );
$$;

CREATE OR REPLACE FUNCTION public.refresh_listing_featured_state(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    has_active boolean;
BEGIN
    IF p_listing_id IS NULL THEN
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.listing_boost_slots lbs
        WHERE lbs.listing_id = p_listing_id
          AND lbs.is_active = true
          AND (lbs.starts_at IS NULL OR lbs.starts_at <= now())
          AND (lbs.ends_at IS NULL OR lbs.ends_at >= now())
    ) INTO has_active;

    UPDATE public.listings
    SET is_featured = has_active,
        updated_at = now()
    WHERE id = p_listing_id;
END;
$$;

-- Garantiza que owner_profile_id siempre sea auth.uid() al crear empresas
CREATE OR REPLACE FUNCTION public.set_company_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.owner_profile_id IS NULL OR NEW.owner_profile_id <> auth.uid() THEN
        NEW.owner_profile_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$;

-- RPC para crear empresa y miembro propietario en un solo paso seguro
CREATE OR REPLACE FUNCTION public.create_company_with_owner(
    input jsonb,
    perms jsonb DEFAULT '{}'::jsonb
)
RETURNS public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_company public.companies;
    v_owner uuid := auth.uid();
BEGIN
    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Auth required';
    END IF;

    INSERT INTO public.companies (
        owner_profile_id,
        legal_name,
        rut,
        billing_email,
        billing_phone,
        address_legal,
        region_id,
        commune_id,
        industry,
        company_type,
        billing_data,
        plan_key
    )
    VALUES (
        v_owner,
        NULLIF(input->>'legal_name', '')::text,
        NULLIF(input->>'rut', '')::text,
        NULLIF(input->>'billing_email', '')::text,
        NULLIF(input->>'billing_phone', '')::text,
        NULLIF(input->>'address_legal', '')::text,
        NULLIF(input->>'region_id', '')::uuid,
        NULLIF(input->>'commune_id', '')::uuid,
        NULLIF(input->>'industry', '')::text,
        NULLIF(input->>'company_type', '')::text,
        COALESCE(input->'billing_data', '{}'::jsonb),
        COALESCE(input->>'plan_key', 'free')
    )
    RETURNING * INTO new_company;

    INSERT INTO public.company_users (company_id, user_id, role, permissions)
    VALUES (new_company.id, v_owner, 'owner', COALESCE(perms, '{}'::jsonb));

    RETURN new_company;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_listing_boost_slots_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    target_listing uuid;
BEGIN
    target_listing := COALESCE(NEW.listing_id, OLD.listing_id);
    PERFORM public.refresh_listing_featured_state(target_listing);
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_sso_token(
    p_user_id uuid,
    p_target_domain text,
    p_expires_in integer DEFAULT 300
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token text;
    v_expires_at timestamptz;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user_id is required';
    END IF;
    IF p_target_domain IS NULL OR length(trim(p_target_domain)) = 0 THEN
        RAISE EXCEPTION 'target_domain is required';
    END IF;

    v_token := encode(gen_random_bytes(32), 'base64url');
    v_expires_at := now() + make_interval(secs => GREATEST(p_expires_in, 60));

    INSERT INTO public.sso_tokens (token, user_id, target_domain, expires_at, metadata)
    VALUES (v_token, p_user_id, p_target_domain, v_expires_at, jsonb_build_object('issued_from', current_setting('request.jwt.claims', true)));

    RETURN json_build_object('token', v_token, 'expires_at', v_expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.init_sso_token(
    p_target_domain text,
    p_expires_in integer DEFAULT 300
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    RETURN public.generate_sso_token(v_user_id, p_target_domain, p_expires_in);
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_sso_token(
    p_token text,
    p_domain text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token_record public.sso_tokens%ROWTYPE;
BEGIN
    SELECT * INTO v_token_record FROM public.sso_tokens WHERE token = p_token;

    IF NOT FOUND THEN
        RETURN json_build_object('valid', false, 'reason', 'not_found');
    END IF;
    IF v_token_record.used_at IS NOT NULL THEN
        RETURN json_build_object('valid', false, 'reason', 'already_used');
    END IF;
    IF v_token_record.expires_at <= now() THEN
        RETURN json_build_object('valid', false, 'reason', 'expired');
    END IF;
    IF p_domain IS NOT NULL AND v_token_record.target_domain <> p_domain THEN
        RETURN json_build_object('valid', false, 'reason', 'domain_mismatch');
    END IF;

    UPDATE public.sso_tokens SET used_at = now() WHERE token = p_token;

    RETURN json_build_object(
        'valid', true,
        'user_id', v_token_record.user_id,
        'target_domain', v_token_record.target_domain
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_company_with_owner(jsonb, jsonb) TO authenticated;

-- Triggers updated_at
CREATE TRIGGER trg_update_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_public_profiles BEFORE UPDATE ON public.public_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_companies BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_brands BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_models BEFORE UPDATE ON public.models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_listings BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_listings_vehicles BEFORE UPDATE ON public.listings_vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_listings_properties BEFORE UPDATE ON public.listings_properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_subscription_plans BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_subscriptions BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_listing_metrics BEFORE UPDATE ON public.listing_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_boost_slots BEFORE UPDATE ON public.boost_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_listing_boosts BEFORE UPDATE ON public.listing_boosts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_listing_boost_slots BEFORE UPDATE ON public.listing_boost_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_user_verticals BEFORE UPDATE ON public.user_verticals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_sso_tokens BEFORE UPDATE ON public.sso_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_profile_addresses BEFORE UPDATE ON public.profile_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_schedules BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_special_schedules BEFORE UPDATE ON public.special_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger search vector
CREATE TRIGGER trg_listing_tsv BEFORE INSERT OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION update_listing_tsv();

-- Trigger sync plan
CREATE TRIGGER trg_sync_plan AFTER INSERT OR UPDATE OF plan_id, status ON public.subscriptions
FOR EACH ROW WHEN (NEW.status = 'active') EXECUTE FUNCTION sync_profile_plan();

-- Trigger featured state refresh
DROP TRIGGER IF EXISTS trg_listing_boost_slots_refresh ON public.listing_boost_slots;
CREATE TRIGGER trg_listing_boost_slots_refresh
    AFTER INSERT OR UPDATE OR DELETE ON public.listing_boost_slots
    FOR EACH ROW
    EXECUTE FUNCTION public.on_listing_boost_slots_change();

-- Trigger auto profile on signup
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_new_user();

-- Trigger para forzar owner_profile_id en companies
DROP TRIGGER IF EXISTS trg_set_company_owner ON public.companies;
CREATE TRIGGER trg_set_company_owner
BEFORE INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.set_company_owner();

/*
=============================================================
12. ÍNDICES
=============================================================
*/

CREATE INDEX idx_regions_code ON public.regions(code);
CREATE INDEX idx_communes_region ON public.communes(region_id);

CREATE INDEX idx_verticals_key ON public.verticals(key);
CREATE INDEX idx_verticals_active ON public.verticals(is_active);

CREATE INDEX idx_vehicle_types_category ON public.vehicle_types(category);
CREATE INDEX vehicle_types_sort_order_idx ON public.vehicle_types(sort_order, created_at);

CREATE INDEX idx_brands_active ON public.brands(is_active);
CREATE INDEX idx_models_brand ON public.models(brand_id);
CREATE INDEX idx_models_type ON public.models(vehicle_type_id);

CREATE INDEX idx_profiles_plan ON public.profiles(plan_key);
CREATE INDEX idx_profiles_type ON public.profiles(user_type);
CREATE INDEX idx_profiles_region ON public.profiles(region_id);
CREATE INDEX idx_profiles_commune ON public.profiles(commune_id);

CREATE INDEX idx_public_profiles_slug ON public.public_profiles(slug);
CREATE INDEX idx_public_profiles_region ON public.public_profiles(region_id);
CREATE INDEX idx_public_profiles_owner ON public.public_profiles(owner_profile_id);
CREATE INDEX idx_public_profiles_company ON public.public_profiles(company_id);

CREATE INDEX idx_companies_plan ON public.companies(plan_key);
CREATE INDEX idx_companies_owner ON public.companies(owner_profile_id);

CREATE INDEX idx_company_users_company ON public.company_users(company_id);
CREATE INDEX idx_company_users_user ON public.company_users(user_id);

CREATE INDEX idx_subscription_plans_vertical ON public.subscription_plans(vertical_id);
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_company ON public.subscriptions(company_id);
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_company ON public.payments(company_id);
CREATE UNIQUE INDEX ux_subscriptions_user ON public.subscriptions(user_id) WHERE company_id IS NULL;
CREATE UNIQUE INDEX ux_subscriptions_company ON public.subscriptions(company_id) WHERE user_id IS NULL;

CREATE INDEX idx_listings_vertical ON public.listings(vertical_id);
CREATE INDEX idx_listings_public_profile ON public.listings(public_profile_id);
CREATE INDEX idx_listings_user ON public.listings(user_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_published ON public.listings(published_at);
CREATE INDEX idx_listings_featured ON public.listings(is_featured);
CREATE INDEX idx_listings_region ON public.listings(region_id);
CREATE INDEX idx_listings_commune ON public.listings(commune_id);
CREATE INDEX idx_listings_search ON public.listings USING gin(search_vector);

CREATE INDEX idx_listings_vehicles_brand ON public.listings_vehicles(brand_id);
CREATE INDEX idx_listings_vehicles_model ON public.listings_vehicles(model_id);
CREATE INDEX idx_listings_vehicles_type ON public.listings_vehicles(vehicle_type_id);

CREATE INDEX idx_listings_properties_type ON public.listings_properties(property_type);
CREATE INDEX idx_listings_properties_operation ON public.listings_properties(operation_type);

CREATE INDEX idx_images_listing ON public.images(listing_id);
CREATE INDEX idx_documents_listing ON public.documents(listing_id);

CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_profile ON public.reviews(reviewed_profile_id);

CREATE INDEX idx_boost_slots_vertical ON public.boost_slots(vertical_id);
CREATE INDEX idx_listing_boosts_listing ON public.listing_boosts(listing_id);
CREATE INDEX idx_listing_boost_slots_slot ON public.listing_boost_slots(slot_id);
CREATE INDEX idx_listing_boost_slots_active ON public.listing_boost_slots(is_active, ends_at);
CREATE UNIQUE INDEX ux_listing_boost_slots_active ON public.listing_boost_slots(slot_id, listing_id) WHERE is_active = true;

CREATE INDEX idx_user_verticals_user ON public.user_verticals(user_id);
CREATE INDEX idx_user_verticals_vertical ON public.user_verticals(vertical);
CREATE INDEX idx_sso_tokens_user ON public.sso_tokens(user_id);
CREATE INDEX idx_sso_tokens_exp ON public.sso_tokens(expires_at);
CREATE INDEX idx_profile_addresses_profile_id ON public.profile_addresses(profile_id);
CREATE INDEX idx_profile_addresses_default ON public.profile_addresses(profile_id, is_default) WHERE is_default = true;
CREATE INDEX idx_schedules_public_profile ON public.schedules(public_profile_id);
CREATE INDEX idx_special_schedules_public_profile ON public.special_schedules(public_profile_id);
CREATE INDEX idx_public_profile_verticals_vertical ON public.public_profile_verticals(vertical_key);

/*
=============================================================
13. RLS
=============================================================
*/

-- Habilitar RLS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_boost_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_profile_verticals ENABLE ROW LEVEL SECURITY;

-- Públicos
CREATE POLICY "Public select" ON public.regions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public select" ON public.communes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public select" ON public.verticals FOR SELECT USING (true);
CREATE POLICY "Public select" ON public.vehicle_types FOR SELECT USING (true);
CREATE POLICY "Public select" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Public select" ON public.models FOR SELECT USING (true);
CREATE POLICY "Public select" ON public.subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Public select" ON public.boost_slots FOR SELECT USING (is_active = true);

-- Profiles
CREATE POLICY "Own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Public profiles (individual or company facing)
CREATE POLICY "Public profiles public" ON public.public_profiles FOR SELECT USING (is_public = true);
CREATE POLICY "Public profiles member select" ON public.public_profiles FOR SELECT USING (
    owner_profile_id = auth.uid()
    OR (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
);
CREATE POLICY "Public profiles insert" ON public.public_profiles FOR INSERT WITH CHECK (owner_profile_id = auth.uid());
CREATE POLICY "Public profiles manage" ON public.public_profiles FOR ALL USING (
    owner_profile_id = auth.uid()
    OR (company_id IS NOT NULL AND public.is_company_owner(company_id, auth.uid()))
) WITH CHECK (
    owner_profile_id = auth.uid()
    OR (company_id IS NOT NULL AND public.is_company_owner(company_id, auth.uid()))
);

-- Companies (private admin)
CREATE POLICY "Insert companies" ON public.companies FOR INSERT WITH CHECK (owner_profile_id = auth.uid());
CREATE POLICY "Company view" ON public.companies FOR SELECT USING (public.is_company_member(id, auth.uid()));
CREATE POLICY "Company manage" ON public.companies FOR ALL USING (public.is_company_owner(id, auth.uid()));

-- Company users
CREATE POLICY "Company members select" ON public.company_users FOR SELECT USING (
    user_id = auth.uid() OR public.is_company_member(company_id, auth.uid())
);
CREATE POLICY "Company owners manage" ON public.company_users FOR ALL USING (
    public.is_company_owner(company_id, auth.uid())
);

-- Subscriptions
CREATE POLICY "Own subscriptions" ON public.subscriptions FOR SELECT USING (
    user_id = auth.uid() OR company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);
CREATE POLICY "Manage own subscriptions" ON public.subscriptions FOR ALL USING (
    user_id = auth.uid() OR company_id IN (
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
);

CREATE POLICY "Own payments" ON public.payments FOR SELECT USING (
    user_id = auth.uid() OR company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);

-- Listings
CREATE POLICY "Published listings" ON public.listings FOR SELECT USING (status = 'published');
CREATE POLICY "Own listings" ON public.listings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Company listings" ON public.listings FOR SELECT USING (
    public_profile_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.public_profiles pp
        JOIN public.company_users cu ON cu.company_id = pp.company_id
        WHERE pp.id = public.listings.public_profile_id
          AND cu.user_id = auth.uid()
          AND cu.status = 'active'
    )
);
CREATE POLICY "Manage own listings" ON public.listings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage company listings" ON public.listings FOR ALL USING (
    public_profile_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.public_profiles pp
        JOIN public.company_users cu ON cu.company_id = pp.company_id
        WHERE pp.id = public.listings.public_profile_id
          AND cu.user_id = auth.uid()
          AND cu.role IN ('owner','admin')
          AND cu.status = 'active'
    )
);

-- Vehicle/Property details
CREATE POLICY "Vehicle details select" ON public.listings_vehicles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.listings l
        LEFT JOIN public.public_profiles pp ON pp.id = l.public_profile_id
        LEFT JOIN public.company_users cu ON cu.company_id = pp.company_id AND cu.user_id = auth.uid() AND cu.status = 'active'
        WHERE l.id = listing_id AND (l.status = 'published' OR l.user_id = auth.uid() OR cu.id IS NOT NULL)
    )
);
CREATE POLICY "Vehicle details manage" ON public.listings_vehicles FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.listings l
        LEFT JOIN public.public_profiles pp ON pp.id = l.public_profile_id
        LEFT JOIN public.company_users cu ON cu.company_id = pp.company_id AND cu.user_id = auth.uid() AND cu.role IN ('owner','admin') AND cu.status = 'active'
        WHERE l.id = listing_id AND (l.user_id = auth.uid() OR cu.id IS NOT NULL)
    )
);

CREATE POLICY "Property details select" ON public.listings_properties FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.listings l
        LEFT JOIN public.public_profiles pp ON pp.id = l.public_profile_id
        LEFT JOIN public.company_users cu ON cu.company_id = pp.company_id AND cu.user_id = auth.uid() AND cu.status = 'active'
        WHERE l.id = listing_id AND (l.status = 'published' OR l.user_id = auth.uid() OR cu.id IS NOT NULL)
    )
);
CREATE POLICY "Property details manage" ON public.listings_properties FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.listings l
        LEFT JOIN public.public_profiles pp ON pp.id = l.public_profile_id
        LEFT JOIN public.company_users cu ON cu.company_id = pp.company_id AND cu.user_id = auth.uid() AND cu.role IN ('owner','admin') AND cu.status = 'active'
        WHERE l.id = listing_id AND (l.user_id = auth.uid() OR cu.id IS NOT NULL)
    )
);

-- Multimedia
CREATE POLICY "Published images" ON public.images FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND status = 'published')
);
CREATE POLICY "Manage own images" ON public.images FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.listings l
        LEFT JOIN public.public_profiles pp ON pp.id = l.public_profile_id
        LEFT JOIN public.company_users cu ON cu.company_id = pp.company_id AND cu.user_id = auth.uid() AND cu.role IN ('owner','admin') AND cu.status = 'active'
        WHERE l.id = listing_id AND (l.user_id = auth.uid() OR cu.id IS NOT NULL)
    )
);

CREATE POLICY "Manage own documents" ON public.documents FOR ALL USING (
    user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.listings l
        LEFT JOIN public.public_profiles pp ON pp.id = l.public_profile_id
        LEFT JOIN public.company_users cu ON cu.company_id = pp.company_id AND cu.user_id = auth.uid() AND cu.role IN ('owner','admin') AND cu.status = 'active'
        WHERE l.id = listing_id AND (l.user_id = auth.uid() OR cu.id IS NOT NULL)
    )
);

-- Interacciones
CREATE POLICY "Manage favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage messages" ON public.messages FOR ALL USING (auth.uid() IN (sender_id, receiver_id));
CREATE POLICY "Manage notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage own reviews" ON public.reviews FOR ALL USING (auth.uid() = reviewer_id);
CREATE POLICY "Public reviews" ON public.reviews FOR SELECT USING (is_public = true);

-- Métricas
CREATE POLICY "Metrics read" ON public.listing_metrics FOR SELECT TO authenticated USING (true);

-- Boosts
CREATE POLICY "Manage boosts" ON public.listing_boosts USING (
    EXISTS (
        SELECT 1 FROM public.listings l
        WHERE l.id = listing_id
          AND (
            l.user_id = auth.uid() OR (
                l.public_profile_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.public_profiles pp
                    JOIN public.company_users cu ON cu.company_id = pp.company_id
                    WHERE pp.id = l.public_profile_id AND cu.user_id = auth.uid() AND cu.status = 'active'
                )
            )
          )
    )
);

CREATE POLICY "Manage boost slots" ON public.listing_boost_slots USING (
    EXISTS (
        SELECT 1 FROM public.listing_boosts b
        JOIN public.listings l ON l.id = b.listing_id
        WHERE b.id = boost_id
          AND (
            l.user_id = auth.uid() OR (
                l.public_profile_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.public_profiles pp
                    JOIN public.company_users cu ON cu.company_id = pp.company_id
                    WHERE pp.id = l.public_profile_id AND cu.user_id = auth.uid() AND cu.status = 'active'
                )
            )
          )
    )
);

CREATE POLICY "Public active boost slots" ON public.listing_boost_slots
    FOR SELECT USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));

-- User verticals
CREATE POLICY "Own user verticals" ON public.user_verticals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service manages user verticals" ON public.user_verticals FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- SSO tokens
CREATE POLICY "SSO service" ON public.sso_tokens FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Direcciones de perfil
CREATE POLICY "Own addresses select" ON public.profile_addresses FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Own addresses insert" ON public.profile_addresses FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Own addresses update" ON public.profile_addresses FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Own addresses delete" ON public.profile_addresses FOR DELETE USING (profile_id = auth.uid());

-- Horarios
CREATE POLICY "Schedules select" ON public.schedules FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.public_profiles pp
        WHERE pp.id = public_profile_id
          AND (pp.owner_profile_id = auth.uid() OR (pp.company_id IS NOT NULL AND public.is_company_member(pp.company_id, auth.uid())))
    )
);
CREATE POLICY "Schedules modify" ON public.schedules FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.public_profiles pp
        WHERE pp.id = public_profile_id
          AND (pp.owner_profile_id = auth.uid() OR (pp.company_id IS NOT NULL AND public.is_company_owner(pp.company_id, auth.uid())))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.public_profiles pp
        WHERE pp.id = public_profile_id
          AND (pp.owner_profile_id = auth.uid() OR (pp.company_id IS NOT NULL AND public.is_company_owner(pp.company_id, auth.uid())))
    )
);

CREATE POLICY "Special schedules select" ON public.special_schedules FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.public_profiles pp
        WHERE pp.id = public_profile_id
          AND (pp.owner_profile_id = auth.uid() OR (pp.company_id IS NOT NULL AND public.is_company_member(pp.company_id, auth.uid())))
    )
);
CREATE POLICY "Special schedules modify" ON public.special_schedules FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.public_profiles pp
        WHERE pp.id = public_profile_id
          AND (pp.owner_profile_id = auth.uid() OR (pp.company_id IS NOT NULL AND public.is_company_owner(pp.company_id, auth.uid())))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.public_profiles pp
        WHERE pp.id = public_profile_id
          AND (pp.owner_profile_id = auth.uid() OR (pp.company_id IS NOT NULL AND public.is_company_owner(pp.company_id, auth.uid())))
    )
);

-- Verticales por perfil público (solo lectura controlada)
CREATE POLICY "Public profile verticals read" ON public.public_profile_verticals FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.public_profiles pp
        WHERE pp.id = public_profile_verticals.public_profile_id
          AND (pp.owner_profile_id = auth.uid() OR (pp.company_id IS NOT NULL AND public.is_company_member(pp.company_id, auth.uid())))
    )
);
CREATE POLICY "Public profile verticals manage" ON public.public_profile_verticals FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.public_profiles pp
        WHERE pp.id = public_profile_verticals.public_profile_id
          AND (pp.owner_profile_id = auth.uid() OR (pp.company_id IS NOT NULL AND public.is_company_owner(pp.company_id, auth.uid())))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.public_profiles pp
        WHERE pp.id = public_profile_verticals.public_profile_id
          AND (pp.owner_profile_id = auth.uid() OR (pp.company_id IS NOT NULL AND public.is_company_owner(pp.company_id, auth.uid())))
    )
);

/*
=============================================================
14. STORAGE BUCKETS
=============================================================
*/

DELETE FROM storage.buckets WHERE id IN ('listings', 'logos');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']),
  ('covers', 'covers', true, 10485760, ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']),
  ('vehicles', 'vehicles', true, 10485760, ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']),
  ('properties', 'properties', true, 10485760, ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']),
  ('documents', 'documents', false, 10485760, ARRAY['application/pdf','image/jpeg','image/jpg','image/png'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Cover images are publicly accessible" ON storage.objects;
CREATE POLICY "Cover images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
DROP POLICY IF EXISTS "Users can upload their own cover" ON storage.objects;
CREATE POLICY "Users can upload their own cover" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "Users can update their own cover" ON storage.objects;
CREATE POLICY "Users can update their own cover" ON storage.objects FOR UPDATE USING (
    bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "Users can delete their own cover" ON storage.objects;
CREATE POLICY "Users can delete their own cover" ON storage.objects FOR DELETE USING (
    bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Vehicle images are publicly accessible" ON storage.objects;
CREATE POLICY "Vehicle images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'vehicles');
DROP POLICY IF EXISTS "Users can upload vehicle images" ON storage.objects;
CREATE POLICY "Users can upload vehicle images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vehicles');
DROP POLICY IF EXISTS "Users can update their vehicle images" ON storage.objects;
CREATE POLICY "Users can update their vehicle images" ON storage.objects FOR UPDATE USING (bucket_id = 'vehicles');
DROP POLICY IF EXISTS "Users can delete their vehicle images" ON storage.objects;
CREATE POLICY "Users can delete their vehicle images" ON storage.objects FOR DELETE USING (bucket_id = 'vehicles');

DROP POLICY IF EXISTS "Property images are publicly accessible" ON storage.objects;
CREATE POLICY "Property images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'properties');
DROP POLICY IF EXISTS "Users can upload property images" ON storage.objects;
CREATE POLICY "Users can upload property images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'properties');
DROP POLICY IF EXISTS "Users can update their property images" ON storage.objects;
CREATE POLICY "Users can update their property images" ON storage.objects FOR UPDATE USING (bucket_id = 'properties');
DROP POLICY IF EXISTS "Users can delete their property images" ON storage.objects;
CREATE POLICY "Users can delete their property images" ON storage.objects FOR DELETE USING (bucket_id = 'properties');

DROP POLICY IF EXISTS "Users can manage their own documents" ON storage.objects;
CREATE POLICY "Users can manage their own documents" ON storage.objects FOR ALL USING (
    bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

/*
=============================================================
15. MENSAJE FINAL
=============================================================
*/

DO $$
BEGIN
    RAISE NOTICE '🎉 Migración completa aplicada';
    RAISE NOTICE '✅ Esquema unificado multi-vertical listo';
    RAISE NOTICE '✅ RLS y storage configurados';
END $$;

-- =====================================================================
-- Source migration: 20251218090000_add_has_business_flag.sql
-- =====================================================================
-- Flag Mi Negocio en perfiles
-- Fecha: 18-12-2025
-- Objetivo: exponer has_business como feature flag derivado de public_profiles para acelerar panel/onboarding

-- 1) Columna con default seguro
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_business boolean NOT NULL DEFAULT false;

-- 2) Backfill inicial tomando perfiles con negocio activo
UPDATE public.profiles p
SET has_business = true
WHERE EXISTS (
  SELECT 1
  FROM public.public_profiles pp
  WHERE pp.owner_profile_id = p.id
    AND pp.status = 'active'
);

-- Nota: la sincronización en tiempo real (crear/suspender public_profile) se maneja en capa app/servicios.

-- =====================================================================
-- Source migration: 20251218100000_drop_unused_profile_columns.sql
-- =====================================================================
-- Drop unused columns from profiles (region_id, commune_id, is_staff, default_vertical)
-- Fecha: 18-12-2025
-- Rationale: Location moves to profile_addresses; staff/default_vertical unused.

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS region_id,
  DROP COLUMN IF EXISTS commune_id,
  DROP COLUMN IF EXISTS is_staff,
  DROP COLUMN IF EXISTS default_vertical;

-- =====================================================================
-- Source migration: 20251226120000_messages_context.sql
-- =====================================================================
-- Add context and routing fields to messages for buy/sell and company-aware inbox
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS context text DEFAULT 'buy',
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS public_profile_id uuid REFERENCES public.public_profiles(id),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz DEFAULT now();

-- Indexes for inbox filters and unread counts
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON public.messages (receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_listing ON public.messages (listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_company ON public.messages (company_id);
CREATE INDEX IF NOT EXISTS idx_messages_context ON public.messages (context);
CREATE INDEX IF NOT EXISTS idx_messages_last_event ON public.messages (last_event_at DESC);

-- Backfill last_event_at from created_at for existing rows
UPDATE public.messages SET last_event_at = created_at WHERE last_event_at IS NULL;

-- =====================================================================
-- Source migration: 20251226123000_messages_views_v2.sql
-- =====================================================================
-- Refresh message views to include latest status and content for inbox
DROP VIEW IF EXISTS public.messages_inbox_user;
DROP VIEW IF EXISTS public.message_threads;

CREATE OR REPLACE VIEW public.message_threads AS
WITH message_base AS (
  SELECT
    m.listing_id,
    COALESCE(m.company_id, pp.company_id) AS company_id,
    l.vertical_id,
    v.key AS vertical_key,
    l.title AS listing_title,
    l.user_id AS owner_id,
    CASE
      WHEN m.sender_id = l.user_id OR m.receiver_id = l.user_id THEN 'sell'
      ELSE 'buy'
    END AS context,
    CASE
      WHEN m.sender_id = l.user_id THEN m.receiver_id
      ELSE m.sender_id
    END AS counterparty_id,
    m.receiver_id,
    m.is_read,
    m.content AS message_content,
    m.status AS message_status,
    m.created_at,
    m.last_event_at
  FROM public.messages m
  JOIN public.listings l ON l.id = m.listing_id
  LEFT JOIN public.public_profiles pp ON pp.id = l.public_profile_id
  JOIN public.verticals v ON v.id = l.vertical_id
  WHERE m.listing_id IS NOT NULL
    AND (m.sender_id IS NOT NULL AND m.receiver_id IS NOT NULL)
),
agg AS (
  SELECT
    listing_id,
    company_id,
    vertical_id,
    vertical_key,
    listing_title,
    owner_id,
    context,
    counterparty_id,
    COUNT(*) FILTER (WHERE receiver_id = owner_id AND is_read = FALSE) AS unread_for_owner,
    COUNT(*) FILTER (WHERE receiver_id <> owner_id AND is_read = FALSE) AS unread_for_counterparty,
    MAX(created_at) AS last_message_at,
    MAX(last_event_at) AS last_event_at
  FROM message_base
  GROUP BY listing_id, company_id, vertical_id, vertical_key, listing_title, owner_id, context, counterparty_id
),
latest AS (
  SELECT DISTINCT ON (listing_id, company_id, vertical_id, owner_id, context, counterparty_id)
    listing_id,
    company_id,
    vertical_id,
    owner_id,
    context,
    counterparty_id,
    message_content AS last_message_content,
    message_status AS last_status,
    last_event_at
  FROM message_base
  ORDER BY listing_id, company_id, vertical_id, owner_id, context, counterparty_id, last_event_at DESC
)
SELECT
  agg.listing_id,
  agg.company_id,
  agg.vertical_id,
  agg.vertical_key,
  agg.listing_title,
  agg.owner_id,
  agg.context,
  agg.counterparty_id,
  agg.unread_for_owner,
  agg.unread_for_counterparty,
  agg.last_message_at,
  agg.last_event_at,
  latest.last_message_content,
  latest.last_status AS status
FROM agg
LEFT JOIN latest ON latest.listing_id = agg.listing_id
  AND latest.company_id IS NOT DISTINCT FROM agg.company_id
  AND latest.vertical_id = agg.vertical_id
  AND latest.owner_id = agg.owner_id
  AND latest.context = agg.context
  AND latest.counterparty_id IS NOT DISTINCT FROM agg.counterparty_id;

CREATE OR REPLACE VIEW public.messages_inbox_user AS
SELECT
  b.listing_id,
  b.company_id,
  b.vertical_id,
  b.vertical_key,
  b.listing_title,
  b.context,
  b.counterparty_id,
  b.last_message_at,
  b.last_event_at,
  b.last_message_content,
  b.status,
  b.owner_id,
  CASE WHEN u.user_id = b.owner_id THEN b.unread_for_owner ELSE b.unread_for_counterparty END AS unread,
  CASE WHEN u.user_id = b.owner_id THEN 'owner' ELSE 'counterparty' END AS role,
  u.user_id
FROM public.message_threads b
JOIN LATERAL (VALUES (b.owner_id), (b.counterparty_id)) AS u(user_id) ON u.user_id IS NOT NULL;

-- =====================================================================
-- Source migration: 20251226124500_notifications_on_message_fix.sql
-- =====================================================================
-- Ensure notification trigger uses standard type "message"
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS trigger AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.receiver_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_title := 'Nuevo mensaje en tu conversación';

  INSERT INTO public.notifications (user_id, type, title, content, data, is_read, created_at)
  VALUES (
    NEW.receiver_id,
    'message',
    v_title,
    COALESCE(NEW.content, ''),
    jsonb_build_object(
      'listing_id', NEW.listing_id,
      'sender_id', NEW.sender_id,
      'receiver_id', NEW.receiver_id,
      'message_id', NEW.id,
      'subject', NEW.subject,
      'context', NEW.context,
      'status', NEW.status,
      'last_event_at', NEW.last_event_at
    ),
    false,
    COALESCE(NEW.last_event_at, now())
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notifications_on_message ON public.messages;
CREATE TRIGGER trg_notifications_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_notification();

-- =====================================================================
-- Source migration: 20251231130000_add_nautical_aerial_vehicle_specs.sql
-- =====================================================================
-- Agrega columnas dedicadas para specs náuticos y aéreos.
-- Mantiene compatibilidad: el wizard sigue guardando specs en listings.metadata->specs,
-- pero estas columnas permiten consultas/filtrado estructurado.

ALTER TABLE public.listings_vehicles
  ADD COLUMN IF NOT EXISTS nautical_type text,
  ADD COLUMN IF NOT EXISTS nautical_length_m numeric(8,2),
  ADD COLUMN IF NOT EXISTS nautical_beam_m numeric(8,2),
  ADD COLUMN IF NOT EXISTS nautical_engine_hours integer,
  ADD COLUMN IF NOT EXISTS nautical_propulsion text,
  ADD COLUMN IF NOT EXISTS nautical_hull_material text,
  ADD COLUMN IF NOT EXISTS nautical_passengers integer,
  ADD COLUMN IF NOT EXISTS nautical_cabins integer,

  ADD COLUMN IF NOT EXISTS aerial_type text,
  ADD COLUMN IF NOT EXISTS aerial_flight_hours integer,
  ADD COLUMN IF NOT EXISTS aerial_engine_count integer,
  ADD COLUMN IF NOT EXISTS aerial_registration text,
  ADD COLUMN IF NOT EXISTS aerial_max_takeoff_weight_kg integer,
  ADD COLUMN IF NOT EXISTS aerial_range_km integer;

-- Semilla incremental de nuevos vehicle_types base.
-- Se agrega en migración (no reescribimos el seed inicial).
INSERT INTO public.vehicle_types (name, slug, category, sort_order)
VALUES
  ('Náutico', 'nautico', 'nautical', 80),
  ('Aéreo', 'aereo', 'aerial', 90)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================================
-- Source migration: 20251231132000_normalize_vehicle_type_categories.sql
-- =====================================================================
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

-- =====================================================================
-- Source migration: 20251231140000_vehicle_types_categories_and_sort_order.sql
-- =====================================================================
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

-- =====================================================================
-- Source migration: 20251231141000_remove_vehicle_type_otro.sql
-- =====================================================================
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

-- =====================================================================
-- Source migration: 20251231142000_collapse_car_variants_to_auto.sql
-- =====================================================================
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

-- =====================================================================
-- Source migration: 20260102090000_expand_catalog_brands_models.sql
-- =====================================================================
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

-- =====================================================================
-- Source migration: 20260102120000_catalog_unverified_brands_models.sql
-- =====================================================================
-- Adds controlled creation fields and normalization to brands/models.
-- Goal: allow users to add missing catalog entries while preventing easy typos/duplicates.

begin;

-- 1) Extensions & normalization helper
create extension if not exists unaccent;

create or replace function public.normalize_catalog_name(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(unaccent(trim(coalesce(input, '')))), '\s+', ' ', 'g');
$$;

-- 2) Add moderation/traceability columns
alter table public.brands
  add column if not exists is_verified boolean not null default true,
  add column if not exists created_by uuid null references auth.users(id) on delete set null;

alter table public.models
  add column if not exists is_verified boolean not null default true,
  add column if not exists created_by uuid null references auth.users(id) on delete set null;

-- 3) Deduplicate case/diacritic variants safely (brands)
create temporary table _brand_dups as
select
  public.normalize_catalog_name(name) as name_norm,
  min(id::text)::uuid as keep_id,
  array_agg(id order by id) as ids
from public.brands
group by public.normalize_catalog_name(name)
having count(*) > 1;

update public.models m
set brand_id = d.keep_id
from _brand_dups d
where m.brand_id = any(d.ids)
  and m.brand_id <> d.keep_id;

delete from public.brands b
using _brand_dups d
where b.id = any(d.ids)
  and b.id <> d.keep_id;

drop table _brand_dups;

-- 4) Deduplicate models variants within brand (brand_id + normalized name)
create temporary table _model_dups as
select
  brand_id,
  public.normalize_catalog_name(name) as name_norm,
  min(id::text)::uuid as keep_id,
  array_agg(id order by id) as ids
from public.models
group by brand_id, public.normalize_catalog_name(name)
having count(*) > 1;

update public.listings_vehicles lv
set model_id = d.keep_id
from _model_dups d
where lv.model_id = any(d.ids)
  and lv.model_id <> d.keep_id;

delete from public.models m
using _model_dups d
where m.id = any(d.ids)
  and m.id <> d.keep_id;

drop table _model_dups;

-- 5) Add generated normalized columns + unique indexes (post-dedup)
-- NOTE: we keep existing unique constraints too; these add case/diacritic-insensitive uniqueness.
alter table public.brands
  add column if not exists name_norm text generated always as (public.normalize_catalog_name(name)) stored;

alter table public.models
  add column if not exists name_norm text generated always as (public.normalize_catalog_name(name)) stored;

create unique index if not exists brands_name_norm_uniq on public.brands (name_norm);
create unique index if not exists models_brand_name_norm_uniq on public.models (brand_id, name_norm);

commit;

-- =====================================================================
-- Source migration: 20260103120000_restore_profiles_is_staff.sql
-- =====================================================================
-- Restore profiles.is_staff (needed by SimpleAdmin staff gate)
-- Fecha: 03-01-2026

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_staff boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_staff IS 'Global staff/admin flag for SimpleAdmin access.';

-- Prevent regular users from self-escalating via column-level privileges.
-- (Service role bypasses RLS and can update this.)
REVOKE UPDATE (is_staff) ON TABLE public.profiles FROM anon;
REVOKE UPDATE (is_staff) ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (is_staff) ON TABLE public.profiles TO service_role;

-- =====================================================================
-- Source migration: 20260104093000_add_features_catalog_body_types.sql
-- =====================================================================
-- Add body-type scoping to features_catalog (used by Paso 3 "Equipamiento")
-- Guard: some environments may not have this table yet.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'features_catalog'
  ) THEN
    ALTER TABLE public.features_catalog
      ADD COLUMN IF NOT EXISTS allowed_body_types text[] NULL;

    -- Helps filtering by body type when needed
    CREATE INDEX IF NOT EXISTS features_catalog_allowed_body_types_gin
      ON public.features_catalog
      USING gin (allowed_body_types);
  END IF;
END $$;

-- =====================================================================
-- Source migration: 20260104121500_add_documents_public_flag.sql
-- =====================================================================
-- Adds per-document public visibility.
-- Documents remain stored in the private `documents` bucket; this flag only controls whether
-- the document metadata (name/type/size) is visible on public listing pages.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'documents'
  ) THEN
    ALTER TABLE public.documents
      ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_documents_listing_public
      ON public.documents (listing_id, is_public);

    -- Allow anyone to read public documents for published listings.
    -- (No storage access; only metadata rows.)
    DROP POLICY IF EXISTS "Published public documents" ON public.documents;
    CREATE POLICY "Published public documents" ON public.documents
      FOR SELECT
      USING (
        is_public = true
        AND EXISTS (
          SELECT 1 FROM public.listings
          WHERE id = listing_id AND status = 'published'
        )
      );
  END IF;
END $$;

-- =====================================================================
-- Source migration: 20260104123000_add_motorhome_vehicle_body_type.sql
-- =====================================================================
-- Adds missing enum value used by frontend (wizard): 'motorhome'
-- This fixes: invalid input value for enum vehicle_body_type: "motorhome"

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'vehicle_body_type'
      AND e.enumlabel = 'motorhome'
  ) THEN
    ALTER TYPE public.vehicle_body_type ADD VALUE 'motorhome';
  END IF;
END $$;

-- =====================================================================
-- Source migration: 20260105120000_listing_reports.sql
-- =====================================================================
/*
  Reportes de publicaciones (vehículos u otras verticales)
  - Inserción: usuarios autenticados
  - Lectura/gestión: staff
*/

CREATE TABLE IF NOT EXISTS public.listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  reason text NOT NULL,
  details text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_reports_status_check CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS listing_reports_listing_id_idx ON public.listing_reports (listing_id);
CREATE INDEX IF NOT EXISTS listing_reports_created_at_idx ON public.listing_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS listing_reports_status_idx ON public.listing_reports (status);

ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

-- Inserción solo por usuarios autenticados y atada al reporter_id (default auth.uid()).
DROP POLICY IF EXISTS "listing_reports_insert_authenticated" ON public.listing_reports;
CREATE POLICY "listing_reports_insert_authenticated"
  ON public.listing_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Lectura solo para staff.
DROP POLICY IF EXISTS "listing_reports_select_staff" ON public.listing_reports;
CREATE POLICY "listing_reports_select_staff"
  ON public.listing_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_staff = true
    )
  );

-- Gestión (update) solo para staff.
DROP POLICY IF EXISTS "listing_reports_update_staff" ON public.listing_reports;
CREATE POLICY "listing_reports_update_staff"
  ON public.listing_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_staff = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_staff = true
    )
  );

-- =====================================================================
-- Source migration: 20260105123000_fix_listing_reports_reporter_id_nullable.sql
-- =====================================================================
/*
  Hardening: si listing_reports.reporter_id quedó NOT NULL en el editor SQL,
  esto lo corrige de forma segura para permitir ON DELETE SET NULL.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listing_reports'
      AND column_name = 'reporter_id'
      AND is_nullable = 'NO'
  ) THEN
    EXECUTE 'ALTER TABLE public.listing_reports ALTER COLUMN reporter_id DROP NOT NULL';
  END IF;
END $$;

-- =====================================================================
-- Source migration: 20260105153000_features_catalog_enable_bus.sql
-- =====================================================================
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

-- =====================================================================
-- Source migration: 20260109094500_enforce_free_pro.sql
-- =====================================================================
-- Enforce Free vs Pro differences at DB level
-- - Free: max 1 published listing, public page stays draft/private
-- - Pro: max 10 published listings, can activate public page

-- Public profiles should default to draft/private for new users.
ALTER TABLE public.public_profiles ALTER COLUMN is_public SET DEFAULT false;
ALTER TABLE public.public_profiles ALTER COLUMN status SET DEFAULT 'draft';

-- Helper: true only when the user has an active Pro subscription.
CREATE OR REPLACE FUNCTION public.is_pro_active_for_user(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.user_id = p_user
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
      AND p.plan_key = 'pro'
      AND p.is_active = true
  );
$$;

-- Helper: resolve plan key for a listing owner (company first, else profile).
CREATE OR REPLACE FUNCTION public.get_plan_key_for_listing(p_user uuid, p_public_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_plan_key text;
BEGIN
  IF p_public_profile_id IS NOT NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.public_profiles
    WHERE id = p_public_profile_id;
  END IF;

  IF v_company_id IS NOT NULL THEN
    SELECT plan_key INTO v_plan_key
    FROM public.companies
    WHERE id = v_company_id;
    RETURN COALESCE(v_plan_key, 'free');
  END IF;

  SELECT plan_key INTO v_plan_key
  FROM public.profiles
  WHERE id = p_user;

  RETURN COALESCE(v_plan_key, 'free');
END;
$$;

-- Enforce max published listings when a listing is (or remains) published.
CREATE OR REPLACE FUNCTION public.listing_publish_limit_ok(
  p_user uuid,
  p_public_profile_id uuid,
  p_listing_id uuid,
  p_next_status public.listing_status
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_plan_key text;
  v_limit int;
  v_published_count int;
BEGIN
  IF p_next_status IS DISTINCT FROM 'published' THEN
    RETURN true;
  END IF;

  v_plan_key := public.get_plan_key_for_listing(p_user, p_public_profile_id);
  v_limit := CASE WHEN v_plan_key = 'pro' THEN 10 ELSE 1 END;

  -- unlimited safety
  IF v_limit < 0 THEN
    RETURN true;
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.public_profiles
  WHERE id = p_public_profile_id;

  IF v_company_id IS NOT NULL THEN
    SELECT count(*)::int INTO v_published_count
    FROM public.listings l
    JOIN public.public_profiles pp ON pp.id = l.public_profile_id
    WHERE pp.company_id = v_company_id
      AND l.status = 'published'
      AND l.id <> p_listing_id;
  ELSE
    SELECT count(*)::int INTO v_published_count
    FROM public.listings l
    WHERE l.user_id = p_user
      AND l.status = 'published'
      AND l.id <> p_listing_id;
  END IF;

  -- Publishing this listing would make it (count + 1)
  RETURN v_published_count < v_limit;
END;
$$;

-- Normalize existing public profiles: Free users should not have active/public pages.
UPDATE public.public_profiles pp
SET is_public = false,
    status = 'draft'
WHERE pp.company_id IS NULL
  AND pp.owner_profile_id IN (SELECT id FROM public.profiles WHERE plan_key IS NULL OR plan_key = 'free')
  AND (pp.is_public = true OR pp.status = 'active');

-- Tighten public_profiles insert/manage policies to enforce activation only for Pro.
DROP POLICY IF EXISTS "Public profiles insert" ON public.public_profiles;
CREATE POLICY "Public profiles insert" ON public.public_profiles
FOR INSERT
WITH CHECK (
  owner_profile_id = auth.uid()
  AND (company_id IS NULL OR public.is_company_owner(company_id, auth.uid()))
  AND (
    public.is_pro_active_for_user(owner_profile_id)
    OR (is_public = false AND status = 'draft')
  )
);

DROP POLICY IF EXISTS "Public profiles manage" ON public.public_profiles;
CREATE POLICY "Public profiles manage" ON public.public_profiles
FOR ALL
USING (
  owner_profile_id = auth.uid()
  OR (company_id IS NOT NULL AND public.is_company_owner(company_id, auth.uid()))
)
WITH CHECK (
  (owner_profile_id = auth.uid() OR (company_id IS NOT NULL AND public.is_company_owner(company_id, auth.uid())))
  AND (
    public.is_pro_active_for_user(owner_profile_id)
    OR (is_public = false AND status = 'draft')
  )
);

-- Enforce publishing limits via listings policies.
DROP POLICY IF EXISTS "Manage own listings" ON public.listings;
CREATE POLICY "Manage own listings" ON public.listings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND public.listing_publish_limit_ok(user_id, public_profile_id, id, status)
);

DROP POLICY IF EXISTS "Manage company listings" ON public.listings;
CREATE POLICY "Manage company listings" ON public.listings
FOR ALL
USING (
  public_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.public_profiles pp
    JOIN public.company_users cu ON cu.company_id = pp.company_id
    WHERE pp.id = public.listings.public_profile_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
      AND cu.status = 'active'
  )
)
WITH CHECK (
  public_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.public_profiles pp
    JOIN public.company_users cu ON cu.company_id = pp.company_id
    WHERE pp.id = public.listings.public_profile_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
      AND cu.status = 'active'
  )
  AND public.listing_publish_limit_ok(user_id, public_profile_id, id, status)
);

-- =====================================================================
-- Source migration: 20260110120000_multi_vertical_subscriptions.sql
-- =====================================================================
-- Multi-vertical subscriptions + per-vertical plan keys
-- Date: 2026-01-10

BEGIN;

-- 1) Ensure plans are scoped to a vertical (backfill existing rows).
DO $$
DECLARE
  v_vehicles_id uuid;
BEGIN
  SELECT id INTO v_vehicles_id
  FROM public.verticals
  WHERE key = 'vehicles'
  LIMIT 1;

  IF v_vehicles_id IS NULL THEN
    RAISE EXCEPTION 'verticals row with key=vehicles not found';
  END IF;

  -- Backfill any legacy plans that were inserted without vertical_id.
  UPDATE public.subscription_plans
  SET vertical_id = v_vehicles_id
  WHERE vertical_id IS NULL;
END $$;

-- Drop legacy global uniqueness and enforce (vertical_id, plan_key).
ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_plan_key_key;

ALTER TABLE public.subscription_plans
  ALTER COLUMN vertical_id SET NOT NULL;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_vertical_plan_key_key UNIQUE (vertical_id, plan_key);


-- 2) Subscriptions become per (target + vertical).
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS vertical_id uuid;

-- Backfill vertical_id from the selected plan.
UPDATE public.subscriptions s
SET vertical_id = p.vertical_id
FROM public.subscription_plans p
WHERE p.id = s.plan_id
  AND s.vertical_id IS NULL;

-- Safety: fail early if any subscription still cannot resolve vertical.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE vertical_id IS NULL) THEN
    RAISE EXCEPTION 'subscriptions.vertical_id backfill failed: found NULL vertical_id rows';
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ALTER COLUMN vertical_id SET NOT NULL;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_vertical_id_fkey
  FOREIGN KEY (vertical_id) REFERENCES public.verticals(id) ON DELETE CASCADE;

-- Keep subscriptions.vertical_id consistent with plan_id.
CREATE OR REPLACE FUNCTION public.sync_subscription_vertical_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan_vertical uuid;
BEGIN
  SELECT vertical_id INTO v_plan_vertical
  FROM public.subscription_plans
  WHERE id = NEW.plan_id;

  IF v_plan_vertical IS NULL THEN
    RAISE EXCEPTION 'subscription_plans.vertical_id is NULL for plan_id %', NEW.plan_id;
  END IF;

  IF NEW.vertical_id IS NULL THEN
    NEW.vertical_id := v_plan_vertical;
  ELSIF NEW.vertical_id <> v_plan_vertical THEN
    RAISE EXCEPTION 'subscriptions.vertical_id (%) must match plan vertical_id (%)', NEW.vertical_id, v_plan_vertical;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_subscription_vertical_id ON public.subscriptions;
CREATE TRIGGER trg_sync_subscription_vertical_id
BEFORE INSERT OR UPDATE OF plan_id, vertical_id
ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_subscription_vertical_id();

-- Legacy plan caching is global; it becomes incorrect with multi-vertical subscriptions.
DROP TRIGGER IF EXISTS trg_sync_plan ON public.subscriptions;

-- Replace "one subscription per user/company" with "one subscription per user/company per vertical".
DROP INDEX IF EXISTS public.ux_subscriptions_user;
DROP INDEX IF EXISTS public.ux_subscriptions_company;

CREATE UNIQUE INDEX ux_subscriptions_user_vertical
  ON public.subscriptions(user_id, vertical_id)
  WHERE company_id IS NULL;

CREATE UNIQUE INDEX ux_subscriptions_company_vertical
  ON public.subscriptions(company_id, vertical_id)
  WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_vertical ON public.subscriptions(vertical_id);

COMMIT;

-- =====================================================================
-- Source migration: 20260110133000_enforce_listing_limits_by_subscription.sql
-- =====================================================================
-- Enforce listing publish limits using subscriptions per vertical
-- Date: 2026-01-10

BEGIN;

-- Helper: return the best active plan for a listing owner + vertical.
-- - Company subscription (if public_profile belongs to company) wins.
-- - Otherwise user subscription.
CREATE OR REPLACE FUNCTION public.get_active_plan_for_listing(
  p_user uuid,
  p_public_profile_id uuid,
  p_vertical_id uuid
)
RETURNS TABLE(
  plan_key text,
  limits jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF p_vertical_id IS NULL THEN
    RETURN;
  END IF;

  IF p_public_profile_id IS NOT NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.public_profiles
    WHERE id = p_public_profile_id;
  END IF;

  IF v_company_id IS NOT NULL THEN
    RETURN QUERY
      SELECT p.plan_key, p.limits
      FROM public.subscriptions s
      JOIN public.subscription_plans p ON p.id = s.plan_id
      WHERE s.company_id = v_company_id
        AND s.vertical_id = p_vertical_id
        AND s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
        AND p.is_active = true
      ORDER BY COALESCE(p.price_monthly, 0) DESC
      LIMIT 1;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT p.plan_key, p.limits
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.user_id = p_user
      AND s.vertical_id = p_vertical_id
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
      AND p.is_active = true
    ORDER BY COALESCE(p.price_monthly, 0) DESC
    LIMIT 1;
END;
$$;

-- New enforcement function (per-vertical, per-target).
CREATE OR REPLACE FUNCTION public.listing_publish_limit_ok_v2(
  p_user uuid,
  p_public_profile_id uuid,
  p_vertical_id uuid,
  p_listing_id uuid,
  p_next_status public.listing_status
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_limit int;
  v_published_count int;
  v_limits jsonb;
BEGIN
  IF p_next_status IS DISTINCT FROM 'published' THEN
    RETURN true;
  END IF;

  IF p_vertical_id IS NULL THEN
    -- Should not happen (vertical_id is NOT NULL), but keep safe behavior.
    RETURN false;
  END IF;

  -- Resolve limits from active subscription (if any).
  SELECT g.limits INTO v_limits
  FROM public.get_active_plan_for_listing(p_user, p_public_profile_id, p_vertical_id) g
  LIMIT 1;

  -- Free: 1 publicación activa (por vertical).
  v_limit := 1;

  IF v_limits IS NOT NULL THEN
    v_limit := COALESCE(
      NULLIF((v_limits->>'max_active_listings')::int, 0),
      NULLIF((v_limits->>'max_listings')::int, 0),
      v_limit
    );
  END IF;

  -- unlimited safety
  IF v_limit < 0 THEN
    RETURN true;
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.public_profiles
  WHERE id = p_public_profile_id;

  IF v_company_id IS NOT NULL THEN
    SELECT count(*)::int INTO v_published_count
    FROM public.listings l
    JOIN public.public_profiles pp ON pp.id = l.public_profile_id
    WHERE pp.company_id = v_company_id
      AND l.vertical_id = p_vertical_id
      AND l.status = 'published'
      AND l.id <> p_listing_id;
  ELSE
    SELECT count(*)::int INTO v_published_count
    FROM public.listings l
    WHERE l.user_id = p_user
      AND l.vertical_id = p_vertical_id
      AND l.status = 'published'
      AND l.id <> p_listing_id;
  END IF;

  RETURN v_published_count < v_limit;
END;
$$;

-- Re-apply listings policies to use the new function (keeps same policy names).
DROP POLICY IF EXISTS "Manage own listings" ON public.listings;
CREATE POLICY "Manage own listings" ON public.listings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND public.listing_publish_limit_ok_v2(user_id, public_profile_id, vertical_id, id, status)
);

DROP POLICY IF EXISTS "Manage company listings" ON public.listings;
CREATE POLICY "Manage company listings" ON public.listings
FOR ALL
USING (
  public_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.public_profiles pp
    JOIN public.company_users cu ON cu.company_id = pp.company_id
    WHERE pp.id = public.listings.public_profile_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
      AND cu.status = 'active'
  )
)
WITH CHECK (
  public_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.public_profiles pp
    JOIN public.company_users cu ON cu.company_id = pp.company_id
    WHERE pp.id = public.listings.public_profile_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
      AND cu.status = 'active'
  )
  AND public.listing_publish_limit_ok_v2(user_id, public_profile_id, vertical_id, id, status)
);

COMMIT;

-- =====================================================================
-- Source migration: 20260110150000_enforce_listing_create_limits_by_subscription.sql
-- =====================================================================
-- Enforce listing creation limits using subscriptions per vertical
-- Date: 2026-01-10

BEGIN;

-- Limit total listings creation (drafts/duplicates) for Free and plan-defined limits.
CREATE OR REPLACE FUNCTION public.listing_create_limit_ok_v2(
  p_user uuid,
  p_public_profile_id uuid,
  p_vertical_id uuid,
  p_listing_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_limit int;
  v_total_count int;
  v_limits jsonb;
BEGIN
  IF p_vertical_id IS NULL THEN
    RETURN false;
  END IF;

  -- Resolve limits from active subscription (if any).
  SELECT g.limits INTO v_limits
  FROM public.get_active_plan_for_listing(p_user, p_public_profile_id, p_vertical_id) g
  LIMIT 1;

  -- Free: 1 publicación total (por vertical).
  v_limit := 1;

  IF v_limits IS NOT NULL THEN
    -- max_total_listings is preferred; fallback to max_listings when present.
    v_limit := COALESCE(
      NULLIF((v_limits->>'max_total_listings')::int, 0),
      NULLIF((v_limits->>'max_listings')::int, 0),
      v_limit
    );
  END IF;

  -- unlimited safety
  IF v_limit < 0 THEN
    RETURN true;
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.public_profiles
  WHERE id = p_public_profile_id;

  IF v_company_id IS NOT NULL THEN
    SELECT count(*)::int INTO v_total_count
    FROM public.listings l
    JOIN public.public_profiles pp ON pp.id = l.public_profile_id
    WHERE pp.company_id = v_company_id
      AND l.vertical_id = p_vertical_id
      AND (p_listing_id IS NULL OR l.id <> p_listing_id);
  ELSE
    SELECT count(*)::int INTO v_total_count
    FROM public.listings l
    WHERE l.user_id = p_user
      AND l.vertical_id = p_vertical_id
      AND (p_listing_id IS NULL OR l.id <> p_listing_id);
  END IF;

  RETURN v_total_count < v_limit;
END;
$$;

-- Re-apply listings policies to include creation limit.
DROP POLICY IF EXISTS "Manage own listings" ON public.listings;
CREATE POLICY "Manage own listings" ON public.listings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND public.listing_create_limit_ok_v2(user_id, public_profile_id, vertical_id, id)
  AND public.listing_publish_limit_ok_v2(user_id, public_profile_id, vertical_id, id, status)
);

DROP POLICY IF EXISTS "Manage company listings" ON public.listings;
CREATE POLICY "Manage company listings" ON public.listings
FOR ALL
USING (
  public_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.public_profiles pp
    JOIN public.company_users cu ON cu.company_id = pp.company_id
    WHERE pp.id = public.listings.public_profile_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
      AND cu.status = 'active'
  )
)
WITH CHECK (
  public_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.public_profiles pp
    JOIN public.company_users cu ON cu.company_id = pp.company_id
    WHERE pp.id = public.listings.public_profile_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
      AND cu.status = 'active'
  )
  AND public.listing_create_limit_ok_v2(user_id, public_profile_id, vertical_id, id)
  AND public.listing_publish_limit_ok_v2(user_id, public_profile_id, vertical_id, id, status)
);

COMMIT;

-- =====================================================================
-- Source migration: 20260111130000_service_vende_tu_auto_requests.sql
-- =====================================================================
/*
  Servicio: Vende tu auto con SimpleAutos (consignación / venta asistida)
  - Guarda solicitudes de dueños que quieren que SimpleAutos gestione la venta.
  - RLS habilitado sin policies: sólo Service Role (o DB admins) pueden leer/escribir.
*/

CREATE TABLE IF NOT EXISTS public.vehicle_sale_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  status text NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'web',

  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id uuid NULL REFERENCES public.listings(id) ON DELETE SET NULL,

  owner_name text NULL,
  owner_email text NULL,
  owner_phone text NULL,
  owner_city text NULL,

  vehicle_type text NULL,
  vehicle_brand text NULL,
  vehicle_model text NULL,
  vehicle_year int NULL,
  vehicle_mileage_km int NULL,
  desired_price numeric(12,2) NULL,

  notes text NULL,

  ip text NULL,
  user_agent text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.vehicle_sale_service_requests ENABLE ROW LEVEL SECURITY;

-- No policies on purpose (service-role only).

CREATE INDEX IF NOT EXISTS idx_vehicle_sale_service_requests_created_at
  ON public.vehicle_sale_service_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_sale_service_requests_status
  ON public.vehicle_sale_service_requests (status);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_update_vehicle_sale_service_requests_updated_at'
  ) THEN
    -- already exists
    NULL;
  ELSE
    CREATE TRIGGER trg_update_vehicle_sale_service_requests_updated_at
    BEFORE UPDATE ON public.vehicle_sale_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

-- =====================================================================
-- Source migration: 20260111193000_vehicle_sale_service_requests_admin_fields.sql
-- =====================================================================
/*
  Add operational fields for Venta Asistida service requests
  - reference_code: short code to share with customer
  - admin_notes: internal notes
  - contacted_at: when first contact was made
*/

ALTER TABLE public.vehicle_sale_service_requests
  ADD COLUMN IF NOT EXISTS reference_code text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_sale_service_requests_reference_code
  ON public.vehicle_sale_service_requests (reference_code)
  WHERE reference_code IS NOT NULL;

-- =====================================================================
-- Source migration: 20260112123000_vehicle_sale_service_tracking_token_and_events.sql
-- =====================================================================
/*
  Venta asistida: mejoras de seguimiento y auditoría
  - tracking_token: token no adivinable para seguimiento sin email
  - vehicle_sale_service_request_events: historial de cambios (admin / sistema)

  Nota:
  - RLS habilitado sin policies (service-role only), consistente con la tabla principal.
*/

ALTER TABLE public.vehicle_sale_service_requests
  ADD COLUMN IF NOT EXISTS tracking_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_sale_service_requests_tracking_token
  ON public.vehicle_sale_service_requests (tracking_token)
  WHERE tracking_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.vehicle_sale_service_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  request_id uuid NOT NULL REFERENCES public.vehicle_sale_service_requests(id) ON DELETE CASCADE,

  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text NULL,

  event_type text NOT NULL,
  from_status text NULL,
  to_status text NULL,

  data jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.vehicle_sale_service_request_events ENABLE ROW LEVEL SECURITY;

-- No policies on purpose (service-role only).

CREATE INDEX IF NOT EXISTS idx_vehicle_sale_service_request_events_request_id_created_at
  ON public.vehicle_sale_service_request_events (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_sale_service_request_events_created_at
  ON public.vehicle_sale_service_request_events (created_at DESC);

-- =====================================================================
-- Source migration: 20260112130000_messages_view_grants.sql
-- =====================================================================
-- Grants for message inbox views
-- Nota: la visibilidad final depende de RLS en las tablas subyacentes.

GRANT SELECT ON public.message_threads TO authenticated;
GRANT SELECT ON public.messages_inbox_user TO authenticated;
