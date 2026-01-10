import { toEnglish, listingKindMap, vehicleTypeKeyMap, visibilityMap } from './vehicleTranslations';
import { getSupabaseClient } from './supabase/supabase';
import { normalizeVehicleTypeSlug, isUuid } from './vehicleTypeLegacyMap';
import { logError } from './logger';

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
  body_type?: string | null;
  created_at: string;
  image_paths?: string[] | string | null;
  images?: Array<{ url: string; position?: number | null; is_primary?: boolean | null }> | null;
  metadata?: any;
  // Compat: UI y mapeos legacy esperan `specs`.
  specs?: any;
  allow_financing?: boolean;
  allow_exchange?: boolean;
  featured?: boolean;
  visibility?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
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
  // Información del vendedor
  profiles?: {
    username: string;
    public_name: string;
    avatar_url: string | null;
  } | null;
  // Fallback desde perfil público (business/public page)
  public_profile?: {
    slug: string | null;
    public_name: string | null;
    avatar_url: string | null;
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

  // Resolver verticales de autos (tolerante a setups donde el key no exista o sea distinto).
  const { data: verticalRows, error: verticalError } = await supabase
    .from('verticals')
    .select('id, key')
    .in('key', ['vehicles', 'autos']);

  if (verticalError) {
    // No bloqueamos la búsqueda: el JOIN listings_vehicles ya acota a autos.
    logError('Error fetching vehicles vertical', verticalError, { scope: 'searchVehicles' });
  }

  const verticalIds = (verticalRows || []).map((v: any) => v.id).filter(Boolean);

  // Incluir JOINs con communes, regions, vehicle_types y listings_vehicles
  // Nota: evitamos `!inner` en brands/models porque muchos listings legacy pueden tener esos campos NULL.
  const baseSelect = 'id,title,listing_type,price,created_at,metadata,allow_financing,allow_exchange,is_featured,visibility,contact_email,contact_phone,contact_whatsapp,rent_daily_price,rent_weekly_price,rent_monthly_price,rent_security_deposit,auction_start_price,auction_start_at,auction_end_at,region_id,commune_id,user_id,communes(name),regions(name),images:images!images_listing_id_fkey(url,position,is_primary),listings_vehicles!inner(vehicle_type_id,body_type,year,mileage,brand_id,model_id,transmission,fuel_type,color,condition,vehicle_types(slug,name),brands(name),models(name))';
  let query = supabase
    .from('listings')
    .select(baseSelect, { count: 'exact' });

  if (verticalIds.length > 0) {
    query = query.in('vertical_id', verticalIds);
  }

  // CRÍTICO: Solo mostrar vehículos publicados (no borradores ni pausados)
  // El enum `listing_status` usa 'published' en la DB, no 'active'.
  query = query.eq('status', 'published');

  // Filtrar por visibilidad - si es 'normal' o 'publica', incluir también 'featured'
  if (filters.visibility === 'normal') {
    query = query.in('visibility', ['normal', 'featured']);
  } else if (filters.visibility) {
    query = query.eq('visibility', filters.visibility);
  }

  if (filters.listing_kind) query = query.eq('listing_type', filters.listing_kind);

  // Resolver tipo:
  // - Si llega category base (car/bus/...), filtramos por todos los vehicle_types de esa category.
  // - Si llega slug legacy (auto/suv/...), resolvemos a un ID único.
  // - Si llega UUID type_id, se usa directo.
  const typeKeyRaw = (filters.type_key ?? '') as string;

  let resolvedTypeId = filters.type_id && isUuid(filters.type_id) ? filters.type_id : undefined;
  let resolvedTypeIds: string[] | undefined;

  if (!resolvedTypeId && typeKeyRaw) {
    const { data: vtData } = await supabase
      .from('vehicle_types')
      .select('id, category')
      .in('category', [typeKeyRaw, typeKeyRaw === 'machinery' ? 'industrial' : typeKeyRaw]);

    resolvedTypeIds = (vtData || [])
      .map((t: any) => t?.id)
      .filter(Boolean) as string[];
  }

  if (!resolvedTypeId && (!resolvedTypeIds || resolvedTypeIds.length === 0)) {
    const normalizedTypeSlug = normalizeVehicleTypeSlug(filters.type_id) || normalizeVehicleTypeSlug(filters.type_key);
    if (normalizedTypeSlug) {
      const { data: vtData } = await supabase.from('vehicle_types').select('id, slug');
      const match = (vtData || []).find((t: any) => t.slug === normalizedTypeSlug);
      if (match) {
        resolvedTypeId = match.id;
      }
    }
  }

  if (resolvedTypeIds && resolvedTypeIds.length > 0) {
    query = query.in('listings_vehicles.vehicle_type_id', resolvedTypeIds);
  } else if (resolvedTypeId) {
    query = query.eq('listings_vehicles.vehicle_type_id', resolvedTypeId);
  }

  if (filters.brand_id) query = query.eq('listings_vehicles.brand_id', filters.brand_id);
  if (filters.model_id) query = query.eq('listings_vehicles.model_id', filters.model_id);
  if (filters.region_id) query = query.eq('region_id', filters.region_id);
  if (filters.commune_id) query = query.eq('commune_id', filters.commune_id);
  if (filters.body_type) query = query.eq('listings_vehicles.body_type', filters.body_type);

  if (filters.price_min) query = query.gte('price', Number(filters.price_min));
  if (filters.price_max) query = query.lte('price', Number(filters.price_max));
  if (filters.year_min) query = query.gte('listings_vehicles.year', Number(filters.year_min));
  if (filters.year_max) query = query.lte('listings_vehicles.year', Number(filters.year_max));

  // Filtros avanzados (listings_vehicles campos directos)
  if (filters.transmission) {
    query = query.eq('listings_vehicles.transmission', filters.transmission);
  }
  if (filters.fuel_type) {
    query = query.eq('listings_vehicles.fuel_type', filters.fuel_type);
  }
  if (filters.color) {
    query = query.eq('listings_vehicles.color', filters.color);
  }
  if (filters.estado) {
    query = query.eq('listings_vehicles.condition', filters.estado);
  }

  // Filtros de condiciones comerciales
  if (filters.financing_available === 'true') {
    query = query.eq('allow_financing', true);
  }

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  // Obtener los profiles de los owner_ids
  // Compat: some responses include `owner_id` and others only `user_id`.
  const normalizedRows = (data || []).map((v: any) => ({ ...(v || {}), owner_id: v.owner_id || v.user_id }));
  const ownerIds = [...new Set(normalizedRows.map((v: any) => v.owner_id).filter(Boolean))];
  let profilesMap: Record<string, any> = {};
  let publicProfilesMap: Record<string, any> = {};
  
  if (ownerIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id,username,public_name,avatar_url')
      .in('id', ownerIds);
    
    if (profilesData) {
      profilesMap = Object.fromEntries(
        profilesData.map(p => [p.id, p])
      );
    }

    // Fallback: algunos vendedores usan avatar en `public_profiles` (perfil público/business)
    const { data: publicProfilesData } = await supabase
      .from('public_profiles')
      .select('owner_profile_id,slug,public_name,avatar_url')
      .in('owner_profile_id', ownerIds);

    if (publicProfilesData) {
      publicProfilesMap = Object.fromEntries(
        publicProfilesData
          .filter((p: any) => p?.owner_profile_id)
          .map((p: any) => [p.owner_profile_id, p])
      );

      // Enriquecer profilesMap para que el resto de la UI (cards) vea el avatar aunque venga null en `profiles`.
      ownerIds.forEach((ownerId: string) => {
        const pub = publicProfilesMap[ownerId];
        if (!pub) return;
        const current = profilesMap[ownerId];
        if (current) {
          if (!current.avatar_url && pub.avatar_url) current.avatar_url = pub.avatar_url;
          if (!current.public_name && pub.public_name) current.public_name = pub.public_name;
        } else {
          profilesMap[ownerId] = {
            id: ownerId,
            username: pub.slug || '',
            public_name: pub.public_name || '',
            avatar_url: pub.avatar_url || null,
          };
        }
      });
    }
  }

  // Agregar profile a cada vehículo y normalizar communes/regions/vehicle_types
  const vehiclesWithProfiles = normalizedRows.map((v: any) => {
    const listingVehicle = Array.isArray(v.listings_vehicles) ? v.listings_vehicles[0] : v.listings_vehicles || null;
    const rawVehicleType = listingVehicle && listingVehicle.vehicle_types && !Array.isArray(listingVehicle.vehicle_types)
      ? listingVehicle.vehicle_types
      : null;

    const metadata = (v.metadata ?? {}) as Record<string, any>;
    const gallery = Array.isArray(metadata.gallery) ? metadata.gallery : [];
    const rawImages = Array.isArray(v.images) ? v.images : [];
    const orderedImages = [...rawImages].sort((a: any, b: any) => {
      const aPrimary = a?.is_primary ? 0 : 1;
      const bPrimary = b?.is_primary ? 0 : 1;
      if (aPrimary === bPrimary) return (a?.position ?? 0) - (b?.position ?? 0);
      return aPrimary - bPrimary;
    });
    const relationImages = orderedImages.map((img: any) => img?.url).filter(Boolean);
    const imagePaths = (gallery.length ? gallery : relationImages) as string[];

    return {
      ...v,
      type_id: v.type_id || listingVehicle?.vehicle_type_id || '',
      body_type: v.body_type || listingVehicle?.body_type || null,
      year: v.year ?? listingVehicle?.year ?? null,
      mileage: v.mileage ?? listingVehicle?.mileage ?? null,
      image_paths: imagePaths,
      specs: metadata,
      listings_vehicles: listingVehicle,
      vehicle_types: rawVehicleType
        ? {
            slug: rawVehicleType.slug,
            label: rawVehicleType.name || rawVehicleType.slug,
          }
        : null,
      profiles: profilesMap[v.owner_id] || null,
      public_profile: publicProfilesMap[v.owner_id] || null,
      communes: (v.communes && typeof v.communes === 'object' && !Array.isArray(v.communes)) ? v.communes : null,
      regions: (v.regions && typeof v.regions === 'object' && !Array.isArray(v.regions)) ? v.regions : null,
      featured: !!v.is_featured || v.visibility === 'featured',
    };
  });

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


