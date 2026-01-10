// Tipos específicos para vehículos (SimpleAutos)
// Generado automáticamente desde la migración de base de datos

import { ListingType } from './shared';

/*
============================
 TIPOS DE VEHÍCULOS
============================
*/

// Estados de vehículos
export type VehicleStatus = 'draft' | 'active' | 'paused' | 'sold' | 'expired';

// Condiciones de vehículos
export type VehicleCondition = 'new' | 'demo' | 'semi_new' | 'used' | 'certified' | 'restored' | 'accident' | 'to_repair' | 'parts';

// Tipos de combustible
export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'cng' | 'lpg' | 'hydrogen' | 'other';

// Tipos de transmisión
export type TransmissionType = 'manual' | 'automatic' | 'cvt' | 'dual_clutch' | 'other';

// Tipos de tracción
export type DrivetrainType = 'fwd' | 'rwd' | 'awd' | '4x4' | 'other';

// Periodos de arriendo
export type RentPeriod = 'daily' | 'weekly' | 'monthly';

/*
============================
 TABLAS DE VEHÍCULOS
============================
*/

// Tipos de vehículo
export interface VehicleType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  category: 'car' | 'motorcycle' | 'truck' | 'bus' | 'industrial' | 'commercial';
  created_at: string;
}

// Subtipos de vehículo
export interface VehicleSubtype {
  id: string;
  type_id: string;
  name: string;
  slug: string;
  created_at: string;
}

// Marcas
export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  created_at: string;
}

// Modelos
export interface Model {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  year_from?: number;
  year_to?: number;
  created_at: string;
}

// Vehículos principales
export interface Vehicle {
  id: string;
  owner_id: string;
  type_id: string;
  subtype_id?: string;
  brand_id?: string;
  model_id?: string;
  title: string;
  description?: string;
  year?: number;
  mileage?: number;
  mileage_unit?: string;
  condition: VehicleCondition;
  status: VehicleStatus;
  listing_type: ListingType;
  price?: number;
  currency?: string;
  rent_daily_price?: number;
  rent_weekly_price?: number;
  rent_monthly_price?: number;
  rent_security_deposit?: number;
  rent_price_period?: RentPeriod;
  auction_start_price?: number;
  auction_current_bid?: number;
  auction_bid_count?: number;
  auction_start_at?: string;
  auction_end_at?: string;
  region_id?: number;
  commune_id?: number;
  address?: string;
  specs?: Record<string, any>;
  commercial_conditions?: Record<string, any>;
  visibility?: 'normal' | 'featured' | 'hidden';
  featured?: boolean;
  allow_financing?: boolean;
  allow_exchange?: boolean;
  published_at?: string;
  sold_at?: string;
  expires_at?: string;
  featured_until?: string;
  created_at: string;
  updated_at: string;
}

// Media de vehículos
export interface VehicleMedia {
  id: string;
  vehicle_id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  alt_text?: string;
  position?: number;
  is_primary?: boolean;
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

// Características de vehículos
export interface VehicleFeature {
  id: string;
  vehicle_id: string;
  feature_id: string;
  value?: string;
  created_at: string;
}

// Condiciones comerciales
export interface CommercialCondition {
  id: string;
  vehicle_id: string;
  mode: 'sale' | 'rent' | 'auction';
  price?: number;
  negotiable?: boolean;
  allows_tradein?: boolean;
  warranty?: string;
  delivery_immediate?: boolean;
  documentation_complete?: boolean;
  in_consignment?: boolean;
  billable?: boolean;
  financing?: Record<string, any>;
  bonuses?: any[];
  discounts?: any[];
  additional_conditions?: string;
  created_at: string;
  updated_at: string;
}

// Configuración de subastas de vehículos
export interface VehicleAuctionConfig {
  id: string;
  vehicle_id: string;
  min_bid_increment: number;
  max_bid_increment: number;
  time_extension: number;
  reserve_price?: number;
  buy_now_price?: number;
  allow_auto_bidding?: boolean;
  require_deposit?: boolean;
  deposit_amount?: number;
  created_at: string;
  updated_at: string;
}

// Ofertas de subasta de vehículos
export interface VehicleAuctionBid {
  id: string;
  vehicle_id: string;
  bidder_id: string;
  amount: number;
  status: 'active' | 'outbid' | 'winner' | 'cancelled';
  is_auto_bid?: boolean;
  created_at: string;
  updated_at: string;
}

/*
============================
 VISTAS DETALLADAS DE VEHÍCULOS
============================
*/

// Vista detallada de vehículos
export interface VehicleDetailed extends Vehicle {
  type_name?: string;
  type_category?: string;
  brand_name?: string;
  model_name?: string;
  region_name?: string;
  commune_name?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  company_name_full?: string;
  company_verified?: boolean;
  primary_images?: string[];
  all_images?: string[];
  features_count?: number;
  view_count?: number;
}

/*
============================
 TIPOS DE FORMULARIOS
============================
*/

// Estado del wizard de vehículos
export interface VehicleWizardState {
  // Paso 1: Intención
  intent?: {
    listing_type: ListingType;
  };

  // Paso 2: Tipo de vehículo
  type?: {
    type_id: string;
    subtype_id?: string;
  };

  // Paso 3: Información básica
  basic?: {
    title: string;
    brand_id?: string;
    model_id?: string;
    year?: number;
    mileage?: number;
    condition: VehicleCondition;
  };

  // Paso 4: Especificaciones técnicas
  specs?: {
    specs: Record<string, any>;
    features: string[];
  };

  // Paso 5: Media
  media?: {
    images: File[];
    videos: File[];
    documents: File[];
  };

  // Paso 6: Condiciones comerciales
  commercial?: {
    listing_type: ListingType;
    price?: number;
    rent_daily_price?: number;
    rent_weekly_price?: number;
    rent_monthly_price?: number;
    rent_security_deposit?: number;
    allow_financing?: boolean;
    allow_exchange?: boolean;
    commercial_conditions: Record<string, any>;
  };

  // Paso 7: Ubicación
  location?: {
    region_id: number;
    commune_id: number;
    address?: string;
  };

  // Paso 8: Revisión final
  review?: {
    visibility: 'normal' | 'featured' | 'hidden';
    publish_now: boolean;
  };
}

/*
============================
 TIPOS DE BÚSQUEDA Y FILTROS
============================
*/

// Filtros de búsqueda de vehículos
export interface VehicleFilters {
  listing_type?: ListingType;
  type_id?: string;
  brand_id?: string;
  model_id?: string;
  min_price?: number;
  max_price?: number;
  min_year?: number;
  max_year?: number;
  max_mileage?: number;
  condition?: VehicleCondition[];
  region_id?: number;
  commune_id?: number;
  features?: string[];
  has_financing?: boolean;
  has_exchange?: boolean;
  sort_by?: 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc' | 'mileage_asc' | 'created_desc';
  limit?: number;
  offset?: number;
}

// Resultados de búsqueda de vehículos
export interface VehicleSearchResult {
  vehicles: VehicleDetailed[];
  total_count: number;
  has_more: boolean;
  filters_applied: VehicleFilters;
}