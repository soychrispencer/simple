import { Vehicle, RentPricePeriod, ListingKind, VehicleCategory, Visibility } from "@/types/vehicle";

// Tipos para registros de base de datos
interface VehicleDBRow {
  id: string;
  title: string;
  listing_type: string;
  price: number | null;
  year: number | null;
  mileage: number | null;
  image_paths: string[] | string | null;
  type_id: string | null;
  brand_id?: string | null;
  model_id?: string | null;
  type_key?: string | null;
  type_label?: string | null;
  region_name?: string | null;
  commune_name?: string | null;
  region_id?: string | null;
  commune_id?: string | null;
  owner_id?: string | null;
  created_at: string;
  visibility: string | null;
  allow_financing: boolean;
  allow_exchange: boolean;
  featured: boolean;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_price_period?: string | null;
  rent_security_deposit?: number | null;
  auction_start_price?: number | null;
  auction_start_at?: string | null;
  auction_end_at?: string | null;
  extra_specs?: Record<string, any> | null;
}

export interface VehicleJoinedRow extends VehicleDBRow {
  listings_vehicles?: {
    brands?: {
      name: string;
    } | null;
    models?: {
      name: string;
      vehicle_types?: {
        category: string;
      } | null;
    } | null;
    brand_id: string;
    model_id: string;
    year: number;
    mileage: number;
    transmission: string;
    fuel_type: string;
    condition?: string | null;
    color?: string | null;
  } | null;
  regions?: {
    name: string;
  } | null;
  communes?: {
    name: string;
  } | null;
}

interface Profile {
  id: string;
  username?: string;
  public_name?: string;
  avatar_url?: string;
}

// Tipo de fila destacada obtenida desde backend legado.
export interface FeaturedVehicleRow {
  id: string;
  title: string;
  listing_type: 'sale' | 'rent' | 'auction';
  price: number | null;
  year: number | null;
  mileage: number | null;
  image_urls: string[] | null;
  type_id: string | null;
  type_key?: string | null;
  type_label?: string | null;
  region_name?: string | null;
  commune_name?: string | null;
  owner_id?: string | null;
  created_at: string;
  visibility: string | null;
  allow_financing: boolean;
  allow_exchange: boolean;
  featured: boolean;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_price_period?: 'daily' | 'weekly' | 'monthly' | null;
  rent_security_deposit?: number | null;
  auction_start_price?: number | null;
  auction_start_at?: string | null;
  auction_end_at?: string | null;
  profiles?: Profile | null;
  extra_specs?: Record<string, any> | null;
}

/**
 * Función común para mapear un registro de vehículo de la base de datos a FeaturedVehicleRow
 */
export function mapVehicleToFeaturedRow(r: VehicleJoinedRow, profilesMap: Record<string, Profile>): FeaturedVehicleRow {
  const imagePaths = Array.isArray(r.image_paths)
    ? r.image_paths
    : (r.image_paths ? [r.image_paths].filter(Boolean) : []);

  const rentDaily = r.rent_daily_price ?? r.extra_specs?.rent_daily_price ?? null;
  const rentWeekly = r.rent_weekly_price ?? r.extra_specs?.rent_weekly_price ?? null;
  const rentMonthly = r.rent_monthly_price ?? r.extra_specs?.rent_monthly_price ?? null;
  const rentPeriod = (r.rent_price_period ?? r.extra_specs?.rent_price_period) ?? (rentDaily != null
    ? 'daily'
    : rentWeekly != null
    ? 'weekly'
    : rentMonthly != null
    ? 'monthly'
    : null);
  const derivedRentPrice = rentPeriod === 'daily'
    ? rentDaily
    : rentPeriod === 'weekly'
    ? rentWeekly
    : rentPeriod === 'monthly'
    ? rentMonthly
    : null;
  const effectivePrice = derivedRentPrice != null ? derivedRentPrice : r.price;

  return {
    id: r.id,
    title: r.title,
    listing_type: (r.listing_type || 'sale') as FeaturedVehicleRow['listing_type'],
    price: effectivePrice == null ? null : Number(effectivePrice),
    year: r.listings_vehicles?.year === null || r.listings_vehicles?.year === undefined ? null : Number(r.listings_vehicles.year),
    mileage: r.listings_vehicles?.mileage === null || r.listings_vehicles?.mileage === undefined ? null : Number(r.listings_vehicles.mileage),
    image_urls: imagePaths,
    type_id: r.type_id ?? null,
    type_key: (r.listings_vehicles?.models?.vehicle_types?.category as VehicleCategory) || null,
    type_label: r.listing_type ?? null,
    region_name: r.regions?.name ?? null,
    commune_name: r.communes?.name ?? null,
    owner_id: r.owner_id ?? null,
    created_at: r.created_at,
    visibility: r.visibility ?? null,
    allow_financing: !!r.allow_financing,
    allow_exchange: !!r.allow_exchange,
    featured: !!r.featured,
    contact_email: r.contact_email ?? null,
    contact_phone: r.contact_phone ?? null,
    contact_whatsapp: r.contact_whatsapp ?? null,
    rent_daily_price: rentDaily,
    rent_weekly_price: rentWeekly,
    rent_monthly_price: rentMonthly,
    rent_price_period: rentPeriod ?? null,
    rent_security_deposit: r.rent_security_deposit ?? r.extra_specs?.rent_security_deposit ?? null,
    auction_start_price: r.auction_start_price ?? r.extra_specs?.auction_start_price ?? null,
    auction_start_at: r.auction_start_at ?? r.extra_specs?.auction_start_at ?? null,
    auction_end_at: r.auction_end_at ?? r.extra_specs?.auction_end_at ?? null,
    profiles: r.owner_id ? profilesMap[r.owner_id] || null : null,
    extra_specs: r.extra_specs && typeof r.extra_specs === 'object'
      ? {
          ...r.extra_specs,
          rent_daily_price: rentDaily,
          rent_weekly_price: rentWeekly,
          rent_monthly_price: rentMonthly,
          rent_price_period: rentPeriod,
          rent_security_deposit: r.rent_security_deposit ?? r.extra_specs?.rent_security_deposit ?? null,
        }
      : (rentDaily != null || rentWeekly != null || rentMonthly != null || rentPeriod
          ? {
              rent_daily_price: rentDaily,
              rent_weekly_price: rentWeekly,
              rent_monthly_price: rentMonthly,
              rent_price_period: rentPeriod,
              rent_security_deposit: r.rent_security_deposit ?? null,
            }
          : null),
  } as FeaturedVehicleRow;
}

/**
 * Funci�n com�n para cargar perfiles de propietarios
 */
export async function loadProfiles(ownerIds: string[]): Promise<Record<string, any>> {
  const profilesMap: Record<string, any> = {};

  if (ownerIds.length > 0) {
    const params = new URLSearchParams({ owner_ids: ownerIds.join(',') });
    const response = await fetch(`/api/public-profiles?${params.toString()}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({} as Record<string, unknown>));
    const publicProfiles = response.ok && Array.isArray((payload as any)?.profiles)
      ? (payload as any).profiles
      : [];

    publicProfiles
      .filter((p: any) => p?.owner_profile_id)
      .forEach((p: any) => {
        const ownerId = String(p.owner_profile_id);
        profilesMap[ownerId] = {
          id: ownerId,
          username: p.slug || '',
          public_name: p.public_name || 'Vendedor',
          avatar_url: p.avatar_url || null,
        };
      });
  }

  return profilesMap;
}

interface VehicleRowForMapping {
  id: string;
  title: string;
  listing_type: string;
  price: number | null;
  year: number | null;
  mileage: number | null;
  type_id: string | null;
  image_paths?: string[] | string | null;
  allow_financing: boolean;
  allow_exchange: boolean;
  featured: boolean;
  visibility: string | null;
  created_at: string;
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_price_period?: string | null;
  vehicle_types?: {
    name: string;
    category?: string;
  } | null;
  listings_vehicles?: {
    models?: {
      vehicle_types?: {
        category: string;
      } | null;
    } | null;
    year: number | null;
    mileage: number | null;
  } | null;
  communes?: {
    name: string;
  } | null;
  regions?: {
    name: string;
  } | null;
  specs?: Record<string, any> | null;
  extra_specs?: Record<string, any> | null;
}

/**
 * Funci�n com�n para mapear VehicleRow a Vehicle en p�ginas de categor�as
 */
export function mapVehicleRowToVehicle(row: VehicleRowForMapping): Vehicle {
  const imagePaths: string[] = Array.isArray(row.image_paths)
    ? row.image_paths
    : row.image_paths
    ? [row.image_paths].filter(Boolean)
    : Array.isArray(row.extra_specs?.gallery)
    ? row.extra_specs?.gallery
    : [];

  // Obtener ubicación desde JOINs o extra_specs
  const communeName = row.communes?.name ||
                      row.specs?.location?.commune_name ||
                      row.specs?.legacy?.commune_name ||
                      'Sin ubicación';
  const regionName = row.regions?.name ||
                     row.specs?.location?.region_name ||
                     row.specs?.legacy?.region_name || '';

  const rentPeriod = (row.specs?.rent_price_period as RentPricePeriod | null | undefined)
    ?? (row.rent_price_period as RentPricePeriod | null | undefined)
    ?? (row.rent_daily_price != null
      ? 'daily'
      : row.rent_weekly_price != null
      ? 'weekly'
      : row.rent_monthly_price != null
      ? 'monthly'
      : null);

  const derivedRentPrice = rentPeriod === 'daily'
    ? row.rent_daily_price
    : rentPeriod === 'weekly'
    ? row.rent_weekly_price
    : rentPeriod === 'monthly'
    ? row.rent_monthly_price
    : null;

  const effectivePrice = derivedRentPrice != null ? derivedRentPrice : row.price;

  return {
    id: row.id,
    owner_id: '',
    type_id: row.type_id || '',
    type_key: (row.listings_vehicles?.models?.vehicle_types?.category as VehicleCategory) || null,
    title: row.title,
    description: null,
    listing_type: row.listing_type as ListingKind,
    price: effectivePrice,
    year: row.year,
    mileage: row.mileage,
    mileage_km: row.mileage,
    brand_id: null,
    model_id: null,
    condition: null,
    color: null,
    region_id: null,
    commune_id: null,
    image_urls: imagePaths,
    image_paths: imagePaths,
    video_url: null,
    document_urls: [],
    allow_financing: row.allow_financing || false,
    allow_exchange: row.allow_exchange || false,
    featured: row.featured || false,
    visibility: (row.visibility as Visibility) || 'normal',
    created_at: row.created_at,
    updated_at: row.created_at,
    published_at: row.created_at,
    expires_at: null,
    commune_name: communeName,
    region_name: regionName,
    // vehicle_types now exposes `name` instead of `label`
    type_label: row.vehicle_types?.name || null,
    extra_specs: row.specs || row.extra_specs || null,
  };
}




