import { getSupabaseClient } from './supabase/supabase';

export interface VehicleDetail {
  id: string;
  owner_id: string;
  type_id: string;
  brand_id: string | null;
  model_id: string | null;
  title: string;
  description: string | null;
  listing_type: string;
  price: number | null;
  year: number | null;
  mileage: number | null;
  color: string | null;
  condition: string | null;
  region_id: number | null;
  commune_id: number | null;
  image_urls: string[] | null;
  video_url: string | null;
  document_urls: string[] | null;
  allow_financing: boolean;
  allow_exchange: boolean;
  visibility: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  expires_at: string | null;
  // Campos para arriendo
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_price_period?: 'daily' | 'weekly' | 'monthly' | null;
  rent_security_deposit?: number | null;
  rent_min_days?: number | null;
  rent_max_days?: number | null;
  // Campos para subasta
  auction_start_price?: number | null;
  auction_reserve_price?: number | null;
  auction_current_bid?: number | null;
  auction_bid_count?: number | null;
  auction_start_at?: string | null;
  auction_end_at?: string | null;
  // Extra specs
  specs?: any;
  // JOINs
  profiles?: {
    id: string;
    username: string;
    public_name: string;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
    description: string | null;
    website: string | null;
    address: string | null;
    plan: string | null;
  } | null;
  communes?: {
    id: number;
    name: string;
  } | null;
  regions?: {
    id: number;
    name: string;
  } | null;
  vehicle_types?: {
    id: string;
    slug: string;
    label: string;
  } | null;
  brands?: {
    id: string;
    name: string;
  } | null;
  models?: {
    id: string;
    name: string;
  } | null;
}

export async function getVehicleById(id: string): Promise<VehicleDetail | null> {
  const supabase = getSupabaseClient();

  // Primero obtener el vehículo
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();

  if (vehicleError) {
    console.error('Error fetching vehicle:', vehicleError.message, vehicleError.details);
    return null;
  }

  if (!vehicle) {
    console.error('No vehicle found with id:', id);
    return null;
  }

  // Obtener datos relacionados en paralelo
  const [
    { data: profile },
    { data: commune },
    { data: region },
    { data: vehicleType },
    { data: brand },
    { data: model }
  ] = await Promise.all([
    vehicle.owner_id ? supabase.from('profiles').select('id,username,public_name,avatar_url,email,phone,description,website,address,plan').eq('id', vehicle.owner_id).single() : Promise.resolve({ data: null }),
    vehicle.commune_id ? supabase.from('communes').select('id,name').eq('id', vehicle.commune_id).single() : Promise.resolve({ data: null }),
    vehicle.region_id ? supabase.from('regions').select('id,name').eq('id', vehicle.region_id).single() : Promise.resolve({ data: null }),
    vehicle.type_id ? supabase.from('vehicle_types').select('id,slug,label').eq('id', vehicle.type_id).single() : Promise.resolve({ data: null }),
    vehicle.brand_id ? supabase.from('brands').select('id,name').eq('id', vehicle.brand_id).single() : Promise.resolve({ data: null }),
    vehicle.model_id ? supabase.from('models').select('id,name').eq('id', vehicle.model_id).single() : Promise.resolve({ data: null })
  ]);

  return {
    ...vehicle,
    // Extraer color del campo specs si existe
    color: vehicle.specs?.color || null,
    profiles: profile || null,
    communes: commune || null,
    regions: region || null,
    vehicle_types: vehicleType || null,
    brands: brand || null,
    models: model || null,
  } as VehicleDetail;
}
