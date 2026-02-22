import { hasActiveBoost } from './boostState';
import { logError, logWarn } from './logger';
import { isSimpleApiListingsEnabled } from '@simple/config';
import { getListingById, getListingMedia, type SdkListingSummary } from '@simple/sdk';

interface VehicleImageRow {
  url: string;
  position: number | null;
  is_primary: boolean | null;
  alt_text: string | null;
  caption: string | null;
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : null;
  }
  return value ?? null;
}

export interface VehicleDetail {
  id: string;
  owner_id: string | null;
  vertical_id: string | null;
  company_id: string | null;
  listing_type: string;
  status: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  visibility: string;
  is_featured: boolean;
  is_urgent: boolean;
  allow_financing: boolean;
  allow_exchange: boolean;
  region_id: string | null;
  commune_id: string | null;
  tags: string[] | null;
  metadata: Record<string, any> | null;
  specs: Record<string, any>;
  features: string[];
  year: number | null;
  mileage: number | null;
  color: string | null;
  condition: string | null;
  vehicle_type_id: string | null;
  brand_id: string | null;
  model_id: string | null;
  traction: string | null;
  transmission: string | null;
  fuel_type: string | null;
  engine_size?: string | number | null;
  body_type?: string | null;
  doors?: number | null;
  seats?: number | null;
  state?: string | null;
  warranty?: string | boolean | null;
  warranty_details?: string | null;
  rent_price_period?: 'daily' | 'weekly' | 'monthly' | null;
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_security_deposit?: number | null;
  rent_min_days?: number | null;
  rent_max_days?: number | null;
  auction_start_price?: number | null;
  auction_start_at?: string | null;
  auction_end_at?: string | null;
  auction_current_bid?: number | null;
  auction_bid_count?: number | null;
  video_url: string | null;
  document_urls: string[] | null;
  public_documents?: { id: string; name: string; url: string; file_type: string | null; file_size: number | null }[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
  expires_at: string | null;
  images: VehicleImageRow[];
  image_urls: string[];
  profiles?: {
    id: string;
    username: string;
    public_name: string;
    avatar_url: string | null;
    description: string | null;
    website: string | null;
    address: string | null;
    plan: string | null;
  } | null;
    public_profile?: {
      id: string;
      slug: string | null;
      public_name: string | null;
      avatar_url: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      whatsapp: string | null;
      whatsapp_type: string | null;
    } | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    contact_whatsapp?: string | null;
  vehicle_types?: {
    id: string;
    name: string;
    category?: string;
    label?: string | null;
  } | null;
  brands?: {
    id: string;
    name: string;
  } | null;
  models?: {
    id: string;
    name: string;
  } | null;
  regions?: {
    id: string;
    name: string;
  } | null;
  communes?: {
    id: string;
    name: string;
  } | null;
}

function mapSimpleApiItemToVehicleDetail(item: SdkListingSummary, imageUrls: string[]): VehicleDetail {
  const now = new Date().toISOString();
  const publishedAt = item.publishedAt || item.createdAt || now;
  const features = Array.isArray(item.features) ? item.features : [];

  return {
    id: item.id,
    owner_id: item.ownerId || null,
    vertical_id: null,
    company_id: null,
    listing_type: item.type,
    status: item.status || 'published',
    title: item.title,
    description: item.description || null,
    price: typeof item.price === 'number' ? item.price : null,
    currency: item.currency || 'CLP',
    visibility: item.visibility || 'normal',
    is_featured: Boolean(item.featured),
    is_urgent: false,
    allow_financing: Boolean(item.allowFinancing),
    allow_exchange: Boolean(item.allowExchange),
    region_id: item.regionId || null,
    commune_id: item.communeId || null,
    tags: null,
    metadata: {
      specs: {
        body_type: item.bodyType || null,
        fuel_type: item.fuelType || null,
        transmission: item.transmission || null,
        color: item.color || null,
      },
      features,
      location: {
        region_name: item.region || null,
        commune_name: item.city || null,
      },
    },
    specs: {
      body_type: item.bodyType || null,
      fuel_type: item.fuelType || null,
      transmission: item.transmission || null,
      color: item.color || null,
      equipment_items: [],
      equipment: [],
    },
    features,
    year: typeof item.year === 'number' ? item.year : null,
    mileage: typeof item.mileage === 'number' ? item.mileage : null,
    color: item.color || null,
    condition: item.condition || null,
    vehicle_type_id: item.typeId || null,
    brand_id: item.brandId || null,
    model_id: item.modelId || null,
    traction: null,
    transmission: item.transmission || null,
    fuel_type: item.fuelType || null,
    engine_size: null,
    body_type: item.bodyType || null,
    doors: null,
    seats: null,
    state: null,
    warranty: null,
    warranty_details: null,
    rent_price_period: item.rentPricePeriod ?? null,
    rent_daily_price: item.rentDailyPrice ?? null,
    rent_weekly_price: item.rentWeeklyPrice ?? null,
    rent_monthly_price: item.rentMonthlyPrice ?? null,
    rent_security_deposit: item.rentSecurityDeposit ?? null,
    rent_min_days: null,
    rent_max_days: null,
    auction_start_price: item.auctionStartPrice ?? null,
    auction_start_at: item.auctionStartAt ?? null,
    auction_end_at: item.auctionEndAt ?? null,
    auction_current_bid: null,
    auction_bid_count: null,
    video_url: null,
    document_urls: null,
    public_documents: [],
    created_at: item.createdAt || publishedAt,
    updated_at: item.createdAt || publishedAt,
    published_at: publishedAt,
    expires_at: null,
    images: imageUrls.map((url, index) => ({
      url,
      position: index,
      is_primary: index === 0,
      alt_text: null,
      caption: null,
    })),
    image_urls: imageUrls,
    profiles: null,
    public_profile: null,
    contact_email: null,
    contact_phone: null,
    contact_whatsapp: null,
    vehicle_types: item.typeId || item.typeLabel || item.typeKey
      ? {
          id: item.typeId || '',
          name: item.typeLabel || item.typeKey || '',
          category: undefined,
          label: item.typeLabel || item.typeKey || null,
        }
      : null,
    brands: item.brandId || item.brandName ? { id: item.brandId || '', name: item.brandName || '' } : null,
    models: item.modelId || item.modelName ? { id: item.modelId || '', name: item.modelName || '' } : null,
    regions: item.region ? { id: item.regionId || '', name: item.region } : null,
    communes: item.city ? { id: item.communeId || '', name: item.city } : null,
  };
}

async function getVehicleByIdFromSimpleApi(id: string): Promise<VehicleDetail | null> {
  const { item } = await getListingById(id);
  if (!item || item.vertical !== 'autos') {
    return null;
  }

  const mediaPayload = await getListingMedia(id).catch(() => ({ items: [] as any[] }));
  const mediaImageUrls = Array.isArray(mediaPayload.items)
    ? mediaPayload.items
        .filter((entry: any) => entry?.kind === 'image' && typeof entry?.url === 'string')
        .sort((a: any, b: any) => Number(a?.order ?? 0) - Number(b?.order ?? 0))
        .map((entry: any) => String(entry.url))
    : [];

  const imageUrls = mediaImageUrls.length
    ? mediaImageUrls
    : item.imageUrl
      ? [item.imageUrl]
      : [];

  return mapSimpleApiItemToVehicleDetail(item, imageUrls);
}

const LISTING_SELECT = `
  id,
  vertical_id,
  user_id,
  public_profile_id,
  status,
  listing_type,
  title,
  description,
  price,
  currency,
  visibility,
  is_urgent,
  allow_financing,
  allow_exchange,
  region_id,
  commune_id,
  tags,
  metadata,
  rent_daily_price,
  rent_weekly_price,
  rent_monthly_price,
  rent_security_deposit,
  auction_start_price,
  auction_start_at,
  auction_end_at,
  video_url,
  document_urls,
  created_at,
  updated_at,
  published_at,
  expires_at,
  contact_email,
  contact_phone,
  contact_whatsapp,
  listing_boost_slots(is_active, ends_at),
  listings_vehicles (
    vehicle_type_id,
    brand_id,
    model_id,
    year,
    mileage,
    transmission,
    fuel_type,
    traction,
    engine_size,
    color,
    body_type,
    doors,
    seats,
    license_plate,
    vin,
    features,
    condition,
    state,
    warranty,
    warranty_details,
    vehicle_types (id, name, category, slug),
    brands (id, name),
    models (id, name)
  ),
  images (
    url,
    position,
    is_primary,
    alt_text,
    caption
  ),
  regions (id, name),
  communes (id, name)
`;

export async function getVehicleById(id: string): Promise<VehicleDetail | null> {
  if (!isSimpleApiListingsEnabled()) {
    logWarn('Simple API vehicle detail disabled; returning null', { listingId: id });
    return null;
  }

  try {
    return await getVehicleByIdFromSimpleApi(id);
  } catch (error) {
    logError('Simple API vehicle detail fetch failed', error, { listingId: id });
    return null;
  }
}

