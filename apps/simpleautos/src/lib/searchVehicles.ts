import { toEnglish, listingKindMap, vehicleTypeKeyMap, visibilityMap } from './vehicleTranslations';
import { isUuid } from './vehicleTypeLegacyMap';
import { logError, logWarn } from './logger';
import { listListings, type SdkListingSummary, type SdkListingType } from '@simple/sdk';
import { isSimpleApiListingsEnabled } from './simpleApiListings';

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
  user_id?: string | null;
  owner_id?: string | null;
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

function isValidSdkListingType(value: unknown): value is SdkListingType {
  return value === 'sale' || value === 'rent' || value === 'auction';
}

function mapSimpleApiListingToVehicleRow(item: SdkListingSummary): VehicleRow {
  const createdAt = item.createdAt || item.publishedAt || new Date().toISOString();

  return {
    id: item.id,
    title: item.title,
    listing_type: item.type,
    user_id: item.ownerId || null,
    owner_id: item.ownerId || null,
    price: typeof item.price === 'number' ? item.price : null,
    year: typeof item.year === 'number' ? item.year : null,
    mileage: typeof item.mileage === 'number' ? item.mileage : null,
    type_id: item.typeId || '',
    body_type: item.bodyType || null,
    created_at: createdAt,
    image_paths: item.imageUrl ? [item.imageUrl] : [],
    specs: {
      condition: item.condition || null,
      fuel_type: item.fuelType || null,
      transmission: item.transmission || null,
      color: item.color || null,
      rent_daily_price: item.rentDailyPrice ?? null,
      rent_weekly_price: item.rentWeeklyPrice ?? null,
      rent_monthly_price: item.rentMonthlyPrice ?? null,
      rent_price_period: item.rentPricePeriod ?? null,
      auction_start_price: item.auctionStartPrice ?? null,
      legacy: {
        region_name: item.region || null,
        commune_name: item.city || null,
      }
    },
    allow_financing: Boolean(item.allowFinancing),
    allow_exchange: Boolean(item.allowExchange),
    featured: Boolean(item.featured),
    visibility: item.visibility || null,
    contact_email: null,
    contact_phone: null,
    contact_whatsapp: null,
    rent_daily_price: item.rentDailyPrice ?? null,
    rent_weekly_price: item.rentWeeklyPrice ?? null,
    rent_monthly_price: item.rentMonthlyPrice ?? null,
    rent_price_period: item.rentPricePeriod ?? null,
    rent_security_deposit: item.rentSecurityDeposit ?? null,
    auction_start_price: item.auctionStartPrice ?? null,
    auction_start_at: item.auctionStartAt ?? null,
    auction_end_at: item.auctionEndAt ?? null,
    region_id: item.regionId ? Number(item.regionId) || null : null,
    commune_id: item.communeId ? Number(item.communeId) || null : null,
    profiles: null,
    public_profile: null,
    communes: item.city ? { name: item.city } : null,
    regions: item.region ? { name: item.region } : null,
    vehicle_types: item.typeKey
      ? {
          slug: item.typeKey,
          label: item.typeLabel || item.typeKey,
        }
      : null,
  };
}

async function searchVehiclesFromSimpleApi(
  filters: ReturnType<typeof normalizeFilters>,
  page: number,
  page_size: number,
  from: number
): Promise<VehicleSearchResult> {
  const listingType = isValidSdkListingType(filters.listing_kind)
    ? (filters.listing_kind as SdkListingType)
    : undefined;

  const payload = await listListings({
    vertical: 'autos',
    type: listingType,
    typeId: filters.type_id && isUuid(filters.type_id) ? filters.type_id : undefined,
    typeKey: filters.type_key || undefined,
    brandId: filters.brand_id || undefined,
    modelId: filters.model_id || undefined,
    bodyType: filters.body_type || undefined,
    regionId: filters.region_id || undefined,
    communeId: filters.commune_id || undefined,
    minPrice: filters.price_min ? Number(filters.price_min) : undefined,
    maxPrice: filters.price_max ? Number(filters.price_max) : undefined,
    yearMin: filters.year_min ? Number(filters.year_min) : undefined,
    yearMax: filters.year_max ? Number(filters.year_max) : undefined,
    visibility: filters.visibility || undefined,
    transmission: filters.transmission || undefined,
    fuelType: filters.fuel_type || undefined,
    color: filters.color || undefined,
    estado: filters.estado || undefined,
    financingAvailable: filters.financing_available === 'true' ? true : undefined,
    limit: page_size,
    offset: from,
  });

  const items = Array.isArray(payload.items) ? payload.items : [];

  return {
    data: items.map(mapSimpleApiListingToVehicleRow),
    count: Number(payload.meta?.total ?? items.length),
    page,
    page_size,
  };
}

export async function searchVehicles(rawFilters: VehicleSearchFilters): Promise<VehicleSearchResult> {
  const filters = normalizeFilters(rawFilters);
  const page = rawFilters.page && rawFilters.page > 0 ? rawFilters.page : 1;
  const page_size = rawFilters.page_size && rawFilters.page_size > 0 ? Math.min(rawFilters.page_size, 60) : 24;
  const from = (page - 1) * page_size;

  if (!isSimpleApiListingsEnabled()) {
    logWarn('Simple API vehicle search disabled; returning empty dataset');
    return { data: [], count: 0, page, page_size };
  }

  try {
    return await searchVehiclesFromSimpleApi(filters, page, page_size, from);
  } catch (error) {
    logError('Simple API vehicle search failed', error, { filters });
    return { data: [], count: 0, page, page_size };
  }
}
