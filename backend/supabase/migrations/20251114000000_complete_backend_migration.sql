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
