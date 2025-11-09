# 🗄️ Diseño de Base de Datos - Ecosistema Simple

**Autor:** Christian  
**Fecha:** 8 de noviembre de 2025  
**Versión:** 1.0

---

## 📋 Índice

1. [Arquitectura de Datos](#arquitectura-de-datos)
2. [Esquema Completo](#esquema-completo)
3. [Tablas Core](#tablas-core)
4. [Tablas por Vertical](#tablas-por-vertical)
5. [RLS Policies](#rls-policies)
6. [Storage Buckets](#storage-buckets)

---

## 🏗️ Arquitectura de Datos

### Principios de Diseño

1. **Multitenancy:** Soporte para múltiples verticales con datos compartidos
2. **Escalabilidad:** Estructura que permite agregar nuevas verticales fácilmente
3. **Seguridad:** Row Level Security (RLS) en todas las tablas
4. **Performance:** Índices optimizados para queries comunes
5. **Auditoría:** Campos created_at/updated_at en todas las tablas

### Estructura General

```
┌─────────────────────────────────────────────────────┐
│                   AUTH.USERS                        │
│              (Supabase Auth nativo)                 │
└─────────────────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────┐
│                 PUBLIC.PROFILES                     │
│          (Perfil extendido del usuario)             │
└─────────────────────────────────────────────────────┘
           │                           │
           ↓                           ↓
┌────────────────────┐      ┌────────────────────────┐
│ USER_VERTICALS     │      │     COMPANIES          │
│ (Roles por         │←────→│  (Empresas/Negocios)   │
│  vertical)         │      │                        │
└────────────────────┘      └────────────────────────┘
           │                           │
           ↓                           ↓
┌─────────────────────────────────────────────────────┐
│              LISTINGS (Publicaciones)               │
│         ├── vehicles (autos)                        │
│         └── properties (propiedades)                │
└─────────────────────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────────────────┐
│          TRANSACCIONES & INTERACCIONES              │
│  ├── bookings (reservas/citas)                      │
│  ├── transactions (ventas/arriendos)                │
│  ├── favorites (favoritos)                          │
│  ├── messages (mensajes)                            │
│  └── reviews (reseñas)                              │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Esquema Completo

### 1. Core Tables (Transversales)

#### `public.profiles`
Perfil extendido del usuario (1:1 con auth.users)

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  country_code TEXT DEFAULT 'CL',
  language TEXT DEFAULT 'es',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- Configuración
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  
  CONSTRAINT profiles_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Índices
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

#### `public.companies`
Empresas (concesionarias, inmobiliarias, rent-a-car)

```sql
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  vertical TEXT NOT NULL, -- 'autos' | 'propiedades'
  
  -- Información de contacto
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Ubicación
  country_code TEXT DEFAULT 'CL',
  city TEXT,
  address TEXT,
  
  -- Branding
  logo_url TEXT,
  cover_url TEXT,
  description TEXT,
  
  -- Suscripción
  subscription_tier TEXT DEFAULT 'free', -- 'free' | 'basic' | 'pro' | 'enterprise'
  subscription_status TEXT DEFAULT 'active', -- 'active' | 'inactive' | 'suspended'
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  
  -- Límites según tier
  max_listings INTEGER DEFAULT 5,
  max_users INTEGER DEFAULT 1,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  
  CONSTRAINT companies_vertical_check CHECK (vertical IN ('autos', 'propiedades')),
  CONSTRAINT companies_tier_check CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise'))
);

-- Índices
CREATE INDEX idx_companies_slug ON public.companies(slug);
CREATE INDEX idx_companies_vertical ON public.companies(vertical);
CREATE INDEX idx_companies_subscription ON public.companies(subscription_tier, subscription_status);
```

#### `public.user_verticals`
Relación usuario-vertical con roles

```sql
CREATE TABLE public.user_verticals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  vertical TEXT NOT NULL, -- 'autos' | 'propiedades'
  role TEXT NOT NULL, -- 'buyer' | 'seller' | 'agent' | 'admin'
  
  -- Si es parte de una empresa
  company_id UUID REFERENCES public.companies ON DELETE CASCADE,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT user_verticals_vertical_check CHECK (vertical IN ('autos', 'propiedades')),
  CONSTRAINT user_verticals_role_check CHECK (role IN ('buyer', 'seller', 'agent', 'admin')),
  CONSTRAINT user_verticals_unique_user_vertical UNIQUE (user_id, vertical, company_id)
);

-- Índices
CREATE INDEX idx_user_verticals_user ON public.user_verticals(user_id);
CREATE INDEX idx_user_verticals_company ON public.user_verticals(company_id);
CREATE INDEX idx_user_verticals_vertical_role ON public.user_verticals(vertical, role);
```

---

### 2. Listings Tables (Publicaciones)

#### `public.vehicles` (SimpleAutos)

```sql
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Propietario
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies ON DELETE CASCADE,
  
  -- Tipo de publicación
  listing_type TEXT NOT NULL, -- 'sale' | 'rent' | 'auction'
  status TEXT DEFAULT 'draft', -- 'draft' | 'active' | 'sold' | 'rented' | 'inactive'
  
  -- Información básica
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  version TEXT,
  
  -- Especificaciones
  mileage INTEGER, -- kilómetros
  fuel_type TEXT, -- 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'plug-in-hybrid'
  transmission TEXT, -- 'manual' | 'automatic' | 'semi-automatic'
  body_type TEXT, -- 'sedan' | 'suv' | 'hatchback' | 'pickup' | 'coupe' | 'van' | 'convertible'
  doors INTEGER,
  seats INTEGER,
  color TEXT,
  
  -- Condición
  condition TEXT, -- 'new' | 'used' | 'certified'
  
  -- Precio
  price DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CLP',
  
  -- Arriendo (si listing_type = 'rent')
  rent_period TEXT, -- 'daily' | 'weekly' | 'monthly'
  rent_min_days INTEGER,
  
  -- Subasta (si listing_type = 'auction')
  auction_start_price DECIMAL(12,2),
  auction_reserve_price DECIMAL(12,2),
  auction_ends_at TIMESTAMPTZ,
  
  -- Descripción y multimedia
  title TEXT NOT NULL,
  description TEXT,
  images JSONB DEFAULT '[]'::JSONB, -- Array de URLs
  video_url TEXT,
  
  -- Ubicación
  country_code TEXT DEFAULT 'CL',
  city TEXT,
  region TEXT,
  
  -- SEO
  slug TEXT UNIQUE,
  
  -- Features adicionales
  features JSONB DEFAULT '{}'::JSONB,
  
  -- Boost/Destacado
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMPTZ,
  
  -- Contadores
  views_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  CONSTRAINT vehicles_listing_type_check CHECK (listing_type IN ('sale', 'rent', 'auction')),
  CONSTRAINT vehicles_status_check CHECK (status IN ('draft', 'active', 'sold', 'rented', 'inactive')),
  CONSTRAINT vehicles_year_check CHECK (year BETWEEN 1900 AND 2100),
  CONSTRAINT vehicles_price_positive CHECK (price > 0)
);

-- Índices
CREATE INDEX idx_vehicles_user ON public.vehicles(user_id);
CREATE INDEX idx_vehicles_company ON public.vehicles(company_id);
CREATE INDEX idx_vehicles_listing_type ON public.vehicles(listing_type);
CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicles_brand_model ON public.vehicles(brand, model);
CREATE INDEX idx_vehicles_year ON public.vehicles(year DESC);
CREATE INDEX idx_vehicles_price ON public.vehicles(price);
CREATE INDEX idx_vehicles_created_at ON public.vehicles(created_at DESC);
CREATE INDEX idx_vehicles_featured ON public.vehicles(is_featured, featured_until) WHERE is_featured = true;
CREATE INDEX idx_vehicles_search ON public.vehicles USING gin(to_tsvector('spanish', title || ' ' || COALESCE(description, '')));
```

#### `public.properties` (SimplePropiedades)

```sql
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Propietario
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies ON DELETE CASCADE,
  
  -- Tipo de publicación
  listing_type TEXT NOT NULL, -- 'sale' | 'rent'
  status TEXT DEFAULT 'draft', -- 'draft' | 'active' | 'sold' | 'rented' | 'inactive'
  
  -- Información básica
  property_type TEXT NOT NULL, -- 'apartment' | 'house' | 'commercial' | 'land' | 'office' | 'warehouse'
  operation_type TEXT NOT NULL, -- 'sale' | 'rent' | 'both'
  
  -- Especificaciones
  bedrooms INTEGER,
  bathrooms INTEGER,
  total_area DECIMAL(10,2), -- m²
  built_area DECIMAL(10,2), -- m²
  land_area DECIMAL(10,2), -- m² (para casas/terrenos)
  floors INTEGER,
  floor_number INTEGER, -- En qué piso está (apartamentos)
  parking_spaces INTEGER,
  storage_rooms INTEGER,
  
  -- Precio
  sale_price DECIMAL(12,2),
  rent_price DECIMAL(12,2),
  currency TEXT DEFAULT 'CLP',
  
  -- Costos adicionales
  maintenance_fee DECIMAL(10,2), -- Gastos comunes
  property_tax DECIMAL(10,2), -- Contribuciones anuales
  
  -- Descripción y multimedia
  title TEXT NOT NULL,
  description TEXT,
  images JSONB DEFAULT '[]'::JSONB,
  video_url TEXT,
  virtual_tour_url TEXT,
  
  -- Ubicación
  country_code TEXT DEFAULT 'CL',
  city TEXT NOT NULL,
  region TEXT,
  neighborhood TEXT,
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- SEO
  slug TEXT UNIQUE,
  
  -- Características
  features JSONB DEFAULT '{}'::JSONB, -- { pool, gym, security, etc }
  
  -- Condición
  condition TEXT, -- 'new' | 'used' | 'under_construction' | 'to_renovate'
  year_built INTEGER,
  
  -- Boost/Destacado
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMPTZ,
  
  -- Contadores
  views_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  CONSTRAINT properties_listing_type_check CHECK (listing_type IN ('sale', 'rent')),
  CONSTRAINT properties_status_check CHECK (status IN ('draft', 'active', 'sold', 'rented', 'inactive')),
  CONSTRAINT properties_operation_check CHECK (operation_type IN ('sale', 'rent', 'both'))
);

-- Índices similares a vehicles
CREATE INDEX idx_properties_user ON public.properties(user_id);
CREATE INDEX idx_properties_company ON public.properties(company_id);
CREATE INDEX idx_properties_listing_type ON public.properties(listing_type);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_property_type ON public.properties(property_type);
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE INDEX idx_properties_price_sale ON public.properties(sale_price);
CREATE INDEX idx_properties_price_rent ON public.properties(rent_price);
CREATE INDEX idx_properties_created_at ON public.properties(created_at DESC);
CREATE INDEX idx_properties_featured ON public.properties(is_featured, featured_until) WHERE is_featured = true;
```

---

### 3. Interaction Tables (Interacciones)

#### `public.favorites`
Favoritos de usuarios

```sql
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  
  -- Referencia polimórfica al listing
  listing_type TEXT NOT NULL, -- 'vehicle' | 'property'
  listing_id UUID NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT favorites_listing_type_check CHECK (listing_type IN ('vehicle', 'property')),
  CONSTRAINT favorites_unique_user_listing UNIQUE (user_id, listing_type, listing_id)
);

CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_favorites_listing ON public.favorites(listing_type, listing_id);
```

#### `public.messages`
Sistema de mensajería entre usuarios

```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participantes
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  
  -- Contexto (opcional - sobre qué listing)
  listing_type TEXT, -- 'vehicle' | 'property'
  listing_id UUID,
  
  -- Contenido
  content TEXT NOT NULL,
  
  -- Estado
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT messages_different_users CHECK (sender_id != recipient_id)
);

CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX idx_messages_conversation ON public.messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_messages_listing ON public.messages(listing_type, listing_id);
```

#### `public.bookings`
Reservas/Citas para ver vehículos o propiedades

```sql
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Usuario interesado
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  
  -- Listing
  listing_type TEXT NOT NULL, -- 'vehicle' | 'property'
  listing_id UUID NOT NULL,
  
  -- Dueño del listing
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  
  -- Fecha y hora
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  
  -- Estado
  status TEXT DEFAULT 'pending', -- 'pending' | 'confirmed' | 'cancelled' | 'completed'
  
  -- Notas
  notes TEXT,
  cancellation_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT bookings_listing_type_check CHECK (listing_type IN ('vehicle', 'property')),
  CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
);

CREATE INDEX idx_bookings_user ON public.bookings(user_id);
CREATE INDEX idx_bookings_owner ON public.bookings(owner_id);
CREATE INDEX idx_bookings_listing ON public.bookings(listing_type, listing_id);
CREATE INDEX idx_bookings_scheduled ON public.bookings(scheduled_at);
```

#### `public.transactions`
Transacciones completadas (ventas/arriendos)

```sql
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participantes
  buyer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  
  -- Listing
  listing_type TEXT NOT NULL, -- 'vehicle' | 'property'
  listing_id UUID NOT NULL,
  
  -- Tipo
  transaction_type TEXT NOT NULL, -- 'sale' | 'rent'
  
  -- Montos
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CLP',
  commission DECIMAL(12,2), -- Comisión de la plataforma
  
  -- Pago
  payment_method TEXT, -- 'mercadopago' | 'bank_transfer' | 'cash'
  payment_id TEXT, -- ID de MercadoPago
  payment_status TEXT DEFAULT 'pending', -- 'pending' | 'completed' | 'failed'
  
  -- Fechas (para arriendos)
  rent_start_date DATE,
  rent_end_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT transactions_listing_type_check CHECK (listing_type IN ('vehicle', 'property')),
  CONSTRAINT transactions_transaction_type_check CHECK (transaction_type IN ('sale', 'rent')),
  CONSTRAINT transactions_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_transactions_buyer ON public.transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON public.transactions(seller_id);
CREATE INDEX idx_transactions_listing ON public.transactions(listing_type, listing_id);
CREATE INDEX idx_transactions_payment ON public.transactions(payment_id);
```

---

### 4. CRM Tables

#### `public.crm_leads`
Leads capturados (contactos interesados)

```sql
CREATE TABLE public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Empresa dueña del lead
  company_id UUID NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  vertical TEXT NOT NULL, -- 'autos' | 'propiedades'
  
  -- Información del lead
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  
  -- Contexto
  source TEXT, -- 'website' | 'whatsapp' | 'phone' | 'referral'
  listing_type TEXT, -- 'vehicle' | 'property'
  listing_id UUID,
  
  -- Estado
  status TEXT DEFAULT 'new', -- 'new' | 'contacted' | 'qualified' | 'negotiating' | 'won' | 'lost'
  
  -- Asignación
  assigned_to UUID REFERENCES auth.users,
  
  -- Notas y seguimiento
  notes TEXT,
  next_follow_up TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  
  CONSTRAINT crm_leads_vertical_check CHECK (vertical IN ('autos', 'propiedades')),
  CONSTRAINT crm_leads_status_check CHECK (status IN ('new', 'contacted', 'qualified', 'negotiating', 'won', 'lost'))
);

CREATE INDEX idx_crm_leads_company ON public.crm_leads(company_id);
CREATE INDEX idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX idx_crm_leads_assigned ON public.crm_leads(assigned_to);
CREATE INDEX idx_crm_leads_follow_up ON public.crm_leads(next_follow_up) WHERE next_follow_up IS NOT NULL;
```

---

## 🔒 Row Level Security (RLS) Policies

### Principios de Seguridad

1. **Habilitar RLS en TODAS las tablas**
2. **Políticas por acción:** SELECT, INSERT, UPDATE, DELETE
3. **Validación de ownership:** Solo el dueño puede modificar
4. **Acceso público:** Listings activos visibles para todos
5. **Roles de empresa:** Agentes/admins pueden gestionar listings de su empresa

### Ejemplo: RLS para `vehicles`

```sql
-- Habilitar RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- SELECT: Todos pueden ver listings activos
CREATE POLICY "Vehicles are viewable by everyone"
  ON public.vehicles FOR SELECT
  USING (status = 'active' OR user_id = auth.uid());

-- INSERT: Solo usuarios autenticados
CREATE POLICY "Users can insert their own vehicles"
  ON public.vehicles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Solo el dueño o agentes de la empresa
CREATE POLICY "Users can update their own vehicles"
  ON public.vehicles FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.user_verticals uv
      WHERE uv.user_id = auth.uid()
        AND uv.company_id = vehicles.company_id
        AND uv.role IN ('agent', 'admin')
        AND uv.is_active = true
    )
  );

-- DELETE: Solo el dueño
CREATE POLICY "Users can delete their own vehicles"
  ON public.vehicles FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 📦 Storage Buckets

### Estructura de Buckets

```
storage/
├── avatars/              # Fotos de perfil
│   └── {user_id}/
│       └── avatar.jpg
│
├── companies/            # Logos y covers de empresas
│   └── {company_id}/
│       ├── logo.png
│       └── cover.jpg
│
├── vehicles/             # Imágenes de vehículos
│   └── {vehicle_id}/
│       ├── image-1.jpg
│       ├── image-2.jpg
│       └── ...
│
└── properties/           # Imágenes de propiedades
    └── {property_id}/
        ├── image-1.jpg
        ├── image-2.jpg
        └── ...
```

### Políticas de Storage

```sql
-- Bucket: avatars
-- SELECT: Público
-- INSERT/UPDATE: Solo el dueño
-- DELETE: Solo el dueño

-- Bucket: vehicles
-- SELECT: Público
-- INSERT/UPDATE/DELETE: Solo el dueño del listing

-- Bucket: properties
-- SELECT: Público
-- INSERT/UPDATE/DELETE: Solo el dueño del listing
```

---

## 🔄 Triggers y Functions

### 1. Update `updated_at` automáticamente

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
-- ... etc para todas las tablas
```

### 2. Crear perfil al registrarse

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Actualizar contador de favoritos

```sql
CREATE OR REPLACE FUNCTION update_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.listing_type = 'vehicle' THEN
      UPDATE public.vehicles 
      SET favorites_count = favorites_count + 1
      WHERE id = NEW.listing_id;
    ELSIF NEW.listing_type = 'property' THEN
      UPDATE public.properties 
      SET favorites_count = favorites_count + 1
      WHERE id = NEW.listing_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.listing_type = 'vehicle' THEN
      UPDATE public.vehicles 
      SET favorites_count = GREATEST(favorites_count - 1, 0)
      WHERE id = OLD.listing_id;
    ELSIF OLD.listing_type = 'property' THEN
      UPDATE public.properties 
      SET favorites_count = GREATEST(favorites_count - 1, 0)
      WHERE id = OLD.listing_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_favorite_change
  AFTER INSERT OR DELETE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION update_favorites_count();
```

---

## 🚀 Siguiente Paso

Revisar el documento **03-DESIGN-SYSTEM.md** para entender el sistema de diseño y componentes compartidos.
