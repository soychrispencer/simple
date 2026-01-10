// Tipos compartidos para el backend de Simple Marketplace
// Generado automáticamente desde la migración de base de datos

/*
============================
 TIPOS COMPARTIDOS
============================
*/

// Estados de autenticación
export type AuthStatus = 'initial' | 'checking' | 'authenticated' | 'anonymous' | 'error';

// Tipos de listado
export type ListingType = 'sale' | 'rent' | 'auction';

// Estados de boost
export type BoostStatus = 'active' | 'expired' | 'cancelled';

// Ratings
export type ReviewRating = '1' | '2' | '3' | '4' | '5';

// Estados de mensajes
export type MessageStatus = 'sent' | 'delivered' | 'read';

// Tipos de notificaciones
export type NotificationType = 'message' | 'review' | 'auction_bid' | 'auction_won' | 'auction_lost' | 'vehicle_sold' | 'property_sold' | 'boost_expired' | 'subscription_renewal';

/*
============================
 TABLAS DE REFERENCIA COMPARTIDAS
============================
*/

// Regiones
export interface Region {
  id: number;
  name: string;
  slug?: string;
  created_at: string;
}

// Comunas
export interface Commune {
  id: number;
  name: string;
  slug?: string;
  region_id: number;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

// Catálogo de características
export interface FeatureCatalog {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
  applicable_to: string[];
  created_at: string;
}

/*
============================
 PERFILES Y USUARIOS
============================
*/

// Perfil de usuario extendido
export interface Profile {
  id: string;
  user_id?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  website?: string;
  rut?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationality?: string;
  occupation?: string;
  address?: string;
  region_id?: number;
  commune_id?: number;
  is_public?: boolean;
  show_email?: boolean;
  show_phone?: boolean;
  horario247?: boolean;
  visits?: number;
  rating?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

// Usuario combinado con perfil
export type UserWithProfile = Profile;

// Empresas
export interface Company {
  id: string;
  user_id: string;
  owner_id: string;
  legal_name?: string;
  tax_id?: string;
  business_activity?: string;
  company_type?: string;
  business_type?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  region_id?: number;
  commune_id?: number;
  contact_name?: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  social_links?: Record<string, any>;
  verified?: boolean;
  verification_date?: string;
  created_at: string;
  updated_at: string;
}

// Redes sociales
export interface SocialLink {
  id: string;
  profile_id: string;
  platform: string;
  url: string;
  username?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

// Horarios de atención
export interface Schedule {
  id: string;
  profile_id: string;
  weekday: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time?: string;
  end_time?: string;
  closed?: boolean;
  created_at: string;
  updated_at: string;
}

// Horarios especiales
export interface SpecialSchedule {
  id: string;
  profile_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  closed?: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

/*
============================
 FUNCIONALIDADES COMPARTIDAS
============================
*/

// Reviews/Calificaciones
export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: ReviewRating;
  comment?: string;
  related_vehicle_id?: string;
  related_property_id?: string;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

// Favoritos
export interface Favorite {
  id: string;
  user_id: string;
  vehicle_id?: string;
  property_id?: string;
  created_at: string;
}

// Mensajes
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  subject?: string;
  content: string;
  status: MessageStatus;
  related_vehicle_id?: string;
  related_property_id?: string;
  created_at: string;
  updated_at: string;
}

// Notificaciones
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, any>;
  read_at?: string;
  created_at: string;
}

// Métricas
export interface VehicleMetric {
  id: string;
  vehicle_id: string;
  metric_name: string;
  value: number;
  created_at: string;
  updated_at: string;
}

export interface PropertyMetric {
  id: string;
  property_id: string;
  metric_name: string;
  value: number;
  created_at: string;
  updated_at: string;
}

/*
============================
 RESULTADOS DE AUTENTICACIÓN
============================
*/

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export interface SignUpOptions {
  email: string;
  password: string;
  data?: Record<string, any>;
}

export interface SignInOptions {
  email: string;
  password: string;
}

/*
============================
 VISTAS DETALLADAS
============================
*/

// Vista detallada de perfiles
export interface ProfileComplete extends Profile {
  company_name_full?: string;
  company_description?: string;
  company_website?: string;
  company_logo?: string;
  company_verified?: boolean;
  social_links?: Record<string, string>;
  schedule?: Array<{
    weekday: string;
    start_time?: string;
    end_time?: string;
    closed: boolean;
  }>;
}