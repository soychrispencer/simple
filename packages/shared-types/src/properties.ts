// Tipos específicos para propiedades (SimplePropiedades)
// Generado automáticamente desde la migración de base de datos

import { ListingType } from './shared';

/*
============================
 TIPOS DE PROPIEDADES
============================
*/

// Estados de propiedades
export type PropertyStatus = 'available' | 'reserved' | 'sold' | 'rented' | 'auction_active' | 'auction_ended';

// Tipos de propiedad
export type PropertyType = 'house' | 'apartment' | 'commercial' | 'land' | 'office' | 'warehouse';

/*
============================
 TABLAS DE PROPIEDADES
============================
*/

// Tipos de propiedad
export interface PropertyTypeRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  category: 'residential' | 'commercial' | 'land' | 'industrial';
  created_at: string;
}

// Propiedades principales
export interface Property {
  id: string;
  owner_id: string;
  property_type: PropertyType;
  listing_type: ListingType;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  rent_price?: number;
  rent_period?: 'monthly' | 'weekly' | 'daily';
  area_m2?: number;
  area_built_m2?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  floor?: number;
  total_floors?: number;
  country?: string;
  region_id?: number;
  commune_id?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  has_pool?: boolean;
  has_garden?: boolean;
  has_elevator?: boolean;
  has_balcony?: boolean;
  has_terrace?: boolean;
  has_gym?: boolean;
  has_security?: boolean;
  is_furnished?: boolean;
  allows_pets?: boolean;
  status: PropertyStatus;
  auction_start_price?: number;
  auction_current_bid?: number;
  auction_bid_count?: number;
  auction_start_at?: string;
  auction_end_at?: string;
  visibility?: 'normal' | 'featured' | 'hidden';
  featured?: boolean;
  published_at?: string;
  sold_at?: string;
  expires_at?: string;
  featured_until?: string;
  created_at: string;
  updated_at: string;
}

// Media de propiedades
export interface PropertyMedia {
  id: string;
  property_id: string;
  type: 'image' | 'video' | 'virtual_tour' | 'document';
  url: string;
  alt_text?: string;
  position?: number;
  is_primary?: boolean;
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

// Características de propiedades
export interface PropertyFeature {
  id: string;
  property_id: string;
  feature_id: string;
  value?: string;
  created_at: string;
}

// Configuración de subastas de propiedades
export interface PropertyAuctionConfig {
  id: string;
  property_id: string;
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

// Ofertas de subasta de propiedades
export interface AuctionBid {
  id: string;
  property_id: string;
  bidder_id: string;
  amount: number;
  status: 'active' | 'outbid' | 'winner' | 'cancelled';
  is_auto_bid?: boolean;
  created_at: string;
  updated_at: string;
}

/*
============================
 VISTAS DETALLADAS DE PROPIEDADES
============================
*/

// Vista detallada de propiedades
export interface PropertyDetailed extends Property {
  property_type_name?: string;
  property_type_category?: string;
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

// Estado del wizard de propiedades
export interface PropertyWizardState {
  // Paso 1: Tipo de propiedad
  type?: {
    property_type: PropertyType;
    listing_type: ListingType;
  };

  // Paso 2: Información básica
  basic?: {
    title: string;
    description?: string;
  };

  // Paso 3: Características físicas
  features?: {
    area_m2?: number;
    area_built_m2?: number;
    bedrooms?: number;
    bathrooms?: number;
    parking_spaces?: number;
    floor?: number;
    total_floors?: number;
  };

  // Paso 4: Características adicionales
  amenities?: {
    has_pool?: boolean;
    has_garden?: boolean;
    has_elevator?: boolean;
    has_balcony?: boolean;
    has_terrace?: boolean;
    has_gym?: boolean;
    has_security?: boolean;
    is_furnished?: boolean;
    allows_pets?: boolean;
  };

  // Paso 5: Precios y condiciones
  pricing?: {
    price?: number;
    rent_price?: number;
    rent_period?: 'monthly' | 'weekly' | 'daily';
  };

  // Paso 6: Ubicación
  location?: {
    country: string;
    region_id: number;
    commune_id: number;
    address?: string;
    latitude?: number;
    longitude?: number;
  };

  // Paso 7: Media
  media?: {
    images: File[];
    videos: File[];
    virtual_tours: File[];
    documents: File[];
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

// Filtros de búsqueda de propiedades
export interface PropertyFilters {
  listing_type?: ListingType;
  property_type?: PropertyType[];
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  bedrooms?: number;
  bathrooms?: number;
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_bathrooms?: number;
  max_bathrooms?: number;
  parking_spaces?: number;
  region_id?: number;
  commune_id?: number;
  has_pool?: boolean;
  has_garden?: boolean;
  has_elevator?: boolean;
  has_balcony?: boolean;
  has_terrace?: boolean;
  has_gym?: boolean;
  has_security?: boolean;
  is_furnished?: boolean;
  allows_pets?: boolean;
  features?: string[];
  sort_by?: 'price_asc' | 'price_desc' | 'area_desc' | 'area_asc' | 'created_desc' | 'featured_first';
  limit?: number;
  offset?: number;
}

// Resultados de búsqueda de propiedades
export interface PropertySearchResult {
  properties: PropertyDetailed[];
  total_count: number;
  has_more: boolean;
  filters_applied: PropertyFilters;
}