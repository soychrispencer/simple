// Tipos de propiedad
export type PropertyType = 'house' | 'apartment' | 'commercial' | 'land' | 'office' | 'warehouse';

// Tipo de listado
export type ListingType = 'sale' | 'rent' | 'auction';

// Estado de la propiedad
export type PropertyStatus =
  | 'available'
  | 'reserved'
  | 'sold'
  | 'rented'
  | 'auction_active'
  | 'auction_ended'
  | 'draft'
  | 'paused'
  | 'pending';

// Interfaz para ofertas de subasta
export interface AuctionBid {
  id: string;
  property_id: string;
  bidder_id: string;
  amount: number;
  created_at: string;
  status: 'active' | 'outbid' | 'winner' | 'cancelled';
  bidder?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    phone?: string;
    email?: string;
  };
}

// Interfaz para configuración de subasta
export interface AuctionConfig {
  min_bid_increment: number; // Incremento mínimo entre ofertas (CLP)
  max_bid_increment: number; // Incremento máximo entre ofertas (CLP)
  time_extension: number; // Minutos que se extiende si hay bid al final
  reserve_price?: number; // Precio de reserva (opcional)
  buy_now_price?: number; // Precio "comprar ahora" (opcional)
  allow_auto_bidding: boolean; // Permitir ofertas automáticas
  require_deposit: boolean; // Requerir depósito de garantía
  deposit_amount?: number; // Monto del depósito (% del precio base)
}

// Interfaz principal de Propiedad
export interface Property {
  id: string;
  title: string;
  description?: string;
  property_type: PropertyType;
  listing_type: ListingType;
  status: PropertyStatus;
  
  // Precio
  price: number;
  currency: string;
  rent_price?: number | null;
  
  // Ubicación
  country: string;
  region: string;
  city: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  
  // Características
  bedrooms: number;
  bathrooms: number;
  area_m2: number;
  area_built_m2?: number | null;
  parking_spaces?: number;
  floor?: number | null;
  total_floors?: number | null;
  
  // Features
  has_pool?: boolean;
  has_garden?: boolean;
  has_elevator?: boolean;
  has_balcony?: boolean;
  has_terrace?: boolean;
  has_gym?: boolean;
  has_security?: boolean;
  is_furnished?: boolean;
  allows_pets?: boolean;
  
  // Imágenes y multimedia
  image_urls: string[];
  thumbnail_url?: string;
  video_url?: string | null;
  virtual_tour_url?: string | null;
  
  // Metadata
  owner_id: string;
  views_count: number;
  featured: boolean;
  featured_until?: string | null;
  created_at: string;
  updated_at: string;
  
  // Información del propietario (cuando se hace join)
  profiles?: {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
  };
  
  // Campos de subasta (solo cuando listing_type === 'auction')
  auction_start_price?: number | null;
  auction_start_at?: string | null;
  auction_end_at?: string | null;
  auction_current_bid?: number | null;
  auction_bid_count?: number;
  auction_config?: AuctionConfig;
  auction_bids?: AuctionBid[]; // Historial completo de ofertas
  auction_winner_id?: string | null; // ID del ganador cuando termina
  
  // Relaciones
  owner?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    phone?: string;
    email?: string;
  };
}

// Filtros para búsqueda de propiedades
export interface PropertyFilters {
  property_type?: PropertyType | PropertyType[];
  listing_type?: ListingType;
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_bathrooms?: number;
  max_bathrooms?: number;
  min_area_m2?: number;
  max_area_m2?: number;
  has_pool?: boolean;
  has_garden?: boolean;
  has_elevator?: boolean;
  has_parking?: boolean;
  is_furnished?: boolean;
  allows_pets?: boolean;
  region?: string;
  city?: string;
  featured_only?: boolean;
  // Filtros específicos para subastas
  auction_status?: 'active' | 'ended' | 'upcoming';
  min_auction_price?: number;
  max_auction_price?: number;
}

// Opciones para select de tipo de propiedad
export const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string; icon: string }[] = [
  { value: 'house', label: 'Casa', icon: '🏠' },
  { value: 'apartment', label: 'Departamento', icon: '🏢' },
  { value: 'commercial', label: 'Comercial', icon: '🏪' },
  { value: 'land', label: 'Terreno', icon: '🌳' },
  { value: 'office', label: 'Oficina', icon: '🏢' },
  { value: 'warehouse', label: 'Bodega', icon: '🏭' },
];

// Opciones de habitaciones
export const BEDROOM_OPTIONS = [
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
];

// Opciones de baños
export const BATHROOM_OPTIONS = [
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
];

// Rangos de área
export const AREA_RANGES = [
  { min: 0, max: 50, label: 'Hasta 50 m²' },
  { min: 50, max: 100, label: '50-100 m²' },
  { min: 100, max: 150, label: '100-150 m²' },
  { min: 150, max: 200, label: '150-200 m²' },
  { min: 200, max: 300, label: '200-300 m²' },
  { min: 300, max: 999999, label: 'Más de 300 m²' },
];

// Rangos de precio
export const PRICE_RANGES = [
  { min: 0, max: 50000000, label: 'Hasta $50M' },
  { min: 50000000, max: 100000000, label: '$50M - $100M' },
  { min: 100000000, max: 200000000, label: '$100M - $200M' },
  { min: 200000000, max: 300000000, label: '$200M - $300M' },
  { min: 300000000, max: 500000000, label: '$300M - $500M' },
  { min: 500000000, max: 999999999999, label: 'Más de $500M' },
];
