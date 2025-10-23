import { toEnglish, listingKindMap, vehicleTypeKeyMap, visibilityMap } from './vehicleTranslations';
import { getSupabaseClient } from './supabase/supabase';

export interface VehicleSearchFilters {
  listing_kind?: string; // venta|arriendo|subasta (UI) => sale|rent|auction (DB listing_type)
  type_key?: string; // slug UI (auto, suv, etc) -> vehicle_types.slug
  type_id?: string;  // uuid directo si ya se tiene
  brand_id?: string;
  model_id?: string;
  body_type?: string; // Tipo de carrocería (sedan, suv, etc.)
  region_id?: string;
  commune_id?: string;
  price_min?: number | string;
  price_max?: number | string;
  year_min?: number | string;
  year_max?: number | string;
  visibility?: string; // publica | borrador etc (mapped)
  estado?: string;
  transmission?: string; // manual | automatica
  fuel_type?: string; // gasolina | diesel | electrico | hibrido
  color?: string; // color del vehículo
  financing_available?: string; // 'true' si acepta financiamiento
  has_bonuses?: string; // 'true' si tiene bonos
  has_discounts?: string; // 'true' si tiene descuentos
  page?: number;
  page_size?: number;
}

export interface VehicleRow {
  id: string;
  title: string;
  listing_type: string; // tipo de listado: 'sale' | 'rent' | 'auction'
  price: number | null;
  year: number | null;
  mileage: number | null;
  type_id: string;
  created_at: string;
  // Campos adicionales para arriendo
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_price_period?: 'daily' | 'weekly' | 'monthly' | null;
  rent_security_deposit?: number | null;
  // Campos para subasta
  auction_start_price?: number | null;
  auction_start_at?: string | null;
  auction_end_at?: string | null;
  // Ubicación
  region_id?: number | null;
  commune_id?: number | null;
  specs?: any;
  // Información del vendedor
  profiles?: {
    username: string;
    public_name: string;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  // JOIN results para ubicación y tipo
  communes?: {
    name: string;
  } | null;
  regions?: {
    name: string;
  } | null;
  vehicle_types?: {
    slug: string;
    label: string;
  } | null;
}

export interface VehicleSearchResult {
  data: VehicleRow[];
  count: number;
  page: number;
  page_size: number;
}

function normalizeFilters(f: VehicleSearchFilters) {
  return {
    ...f,
    listing_kind: f.listing_kind && toEnglish(listingKindMap, f.listing_kind),
    type_key: f.type_key && toEnglish(vehicleTypeKeyMap, f.type_key),
  visibility: toEnglish(visibilityMap, f.visibility || 'normal') || 'normal',
  };
}

export async function searchVehicles(rawFilters: VehicleSearchFilters): Promise<VehicleSearchResult> {
  const supabase = getSupabaseClient();
  const filters = normalizeFilters(rawFilters);
  const page = rawFilters.page && rawFilters.page > 0 ? rawFilters.page : 1;
  const page_size = rawFilters.page_size && rawFilters.page_size > 0 ? Math.min(rawFilters.page_size, 60) : 24;
  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  // Incluir JOINs con communes, regions, vehicle_types y commercial_conditions para información completa
  const baseSelect = 'id,title,listing_type,price,year,mileage,type_id,created_at,rent_daily_price,rent_weekly_price,rent_monthly_price,rent_security_deposit,auction_start_price,auction_start_at,auction_end_at,region_id,commune_id,specs,owner_id,communes(name),regions(name),vehicle_types(slug,label),commercial_conditions(financing,bonuses,discounts)';
  let query = supabase
    .from('vehicles')
    .select(baseSelect, { count: 'exact' });

  // CRÍTICO: Solo mostrar vehículos publicados (no borradores ni pausados)
  query = query.eq('status', 'active');

  // Filtrar por visibilidad - si es 'normal' o 'publica', incluir también 'featured'
  if (filters.visibility === 'normal') {
    query = query.in('visibility', ['normal', 'featured']);
  } else if (filters.visibility) {
    query = query.eq('visibility', filters.visibility);
  }

  if (filters.listing_kind) query = query.eq('listing_type', filters.listing_kind);

  // Resolver tipo por slug si no se pasó type_id
  if (!filters.type_id && filters.type_key) {
    const { data: vt } = await supabase.from('vehicle_types').select('id').eq('slug', filters.type_key).single();
    if (vt?.id) query = query.eq('type_id', vt.id);
  } else if (filters.type_id) {
    query = query.eq('type_id', filters.type_id);
  }

  if (filters.brand_id) query = query.eq('brand_id', filters.brand_id);
  if (filters.model_id) query = query.eq('model_id', filters.model_id);
  if (filters.region_id) query = query.eq('region_id', filters.region_id);
  if (filters.commune_id) query = query.eq('commune_id', filters.commune_id);

  // Filtrar por body_type (desde specs JSONB)
  if (filters.body_type) {
    query = query.eq('specs->>body_type', filters.body_type);
  }

  if (filters.price_min) query = query.gte('price', Number(filters.price_min));
  if (filters.price_max) query = query.lte('price', Number(filters.price_max));
  if (filters.year_min) query = query.gte('year', Number(filters.year_min));
  if (filters.year_max) query = query.lte('year', Number(filters.year_max));

  // Filtros avanzados (extra_specs JSONB)
  if (filters.transmission) {
    query = query.or(`extra_specs->transmission.eq.${filters.transmission},extra_specs->legacy->transmission_legacy.eq.${filters.transmission}`);
  }
  if (filters.fuel_type) {
    query = query.or(`extra_specs->fuel_type.eq.${filters.fuel_type},extra_specs->legacy->fuel_legacy.eq.${filters.fuel_type}`);
  }
  if (filters.color) {
    query = query.eq('specs->>color', filters.color);
  }
  if (filters.estado) {
    query = query.or(`extra_specs->condition.eq.${filters.estado},extra_specs->legacy->condition.eq.${filters.estado}`);
  }

  // Filtros de condiciones comerciales
  if (filters.financing_available === 'true') {
    query = query.eq('allow_financing', true);
  }
  if (filters.has_bonuses === 'true') {
    // Filtrar vehículos que tienen bonos (array no vacío)
    query = query.not('commercial_conditions.bonuses', 'eq', '[]');
  }
  if (filters.has_discounts === 'true') {
    // Filtrar vehículos que tienen descuentos (array no vacío)
    query = query.not('commercial_conditions.discounts', 'eq', '[]');
  }

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  // Obtener los profiles de los owner_ids
  const ownerIds = [...new Set((data || []).map(v => v.owner_id).filter(Boolean))];
  let profilesMap: Record<string, any> = {};
  
  if (ownerIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id,username,public_name,avatar_url,email,phone')
      .in('id', ownerIds);
    
    if (profilesData) {
      profilesMap = Object.fromEntries(
        profilesData.map(p => [p.id, p])
      );
    }
  }

  // Agregar profile a cada vehículo y normalizar communes/regions/vehicle_types
  const vehiclesWithProfiles = (data || []).map(v => ({
    ...v,
    profiles: profilesMap[v.owner_id] || null,
    communes: (v.communes && typeof v.communes === 'object' && !Array.isArray(v.communes)) ? v.communes : null,
    regions: (v.regions && typeof v.regions === 'object' && !Array.isArray(v.regions)) ? v.regions : null,
    vehicle_types: (v.vehicle_types && typeof v.vehicle_types === 'object' && !Array.isArray(v.vehicle_types)) ? v.vehicle_types : null,
  }));

  return {
    data: vehiclesWithProfiles.map(r => ({
      ...r,
      price: r.price === null ? null : Number(r.price),
    })) as VehicleRow[],
    count: count || 0,
    page,
    page_size,
  };
}
