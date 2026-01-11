import { getSupabaseClient } from './supabase/supabase';
import { hasActiveBoost } from './boostState';
import { logError } from './logger';

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

async function resolveEquipmentLabels(supabase: any, featureCodes: string[]): Promise<string[]> {
  const codes = Array.from(new Set((featureCodes || []).filter(Boolean)));
  if (codes.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('features_catalog')
      .select('code,label,sort_order')
      .in('code', codes);

    if (error) {
      // Tabla puede no existir en algunos entornos; en ese caso, fallback silencioso.
      const missingTable = /features_catalog/i.test(error.message || '') || error.code === 'PGRST116' || error.code === '42P01' || error.code === '404';
      if (missingTable) return codes;
      return codes;
    }

    const rows: { code: string; label: string; sort_order: number | null }[] = (data || []) as any;
    const byCode = new Map(rows.map(r => [r.code, r.label] as const));
    const known = rows
      .slice()
      .sort((a, b) => {
        const ao = a.sort_order ?? 9999;
        const bo = b.sort_order ?? 9999;
        if (ao !== bo) return ao - bo;
        return String(a.label).localeCompare(String(b.label));
      })
      .map(r => r.label);

    const unknown = codes
      .filter(c => !byCode.has(c))
      // si viene como label (legacy) lo dejamos tal cual
      .map(c => c);

    return Array.from(new Set([...known, ...unknown]));
  } catch {
    return codes;
  }
}

type EquipmentItem = { code: string; label: string; category: string | null; sort_order: number | null };

async function resolveEquipmentItems(supabase: any, featureCodes: string[]): Promise<EquipmentItem[]> {
  const codes = Array.from(new Set((featureCodes || []).filter(Boolean)));
  if (codes.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('features_catalog')
      .select('code,label,category,sort_order')
      .in('code', codes);

    if (error) {
      const missingTable = /features_catalog/i.test(error.message || '') || error.code === 'PGRST116' || error.code === '42P01' || error.code === '404';
      if (missingTable) {
        return codes.map((c) => ({ code: c, label: c, category: null, sort_order: null }));
      }
      return codes.map((c) => ({ code: c, label: c, category: null, sort_order: null }));
    }

    const rows: EquipmentItem[] = (data || []) as any;
    const byCode = new Map(rows.map((r) => [r.code, r] as const));
    const known = rows
      .slice()
      .sort((a, b) => {
        const ao = a.sort_order ?? 9999;
        const bo = b.sort_order ?? 9999;
        if (ao !== bo) return ao - bo;
        return String(a.label).localeCompare(String(b.label));
      });

    const unknown = codes
      .filter((c) => !byCode.has(c))
      .map((c) => ({ code: c, label: c, category: null, sort_order: null }));

    return [...known, ...unknown];
  } catch {
    return codes.map((c) => ({ code: c, label: c, category: null, sort_order: null }));
  }
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
  const supabase = getSupabaseClient();

  // Nota: evitamos `.single()`/`.maybeSingle()` porque PostgREST responde 406
  // cuando 0 filas pasan RLS/filters, lo que ensucia consola (aunque lo manejemos).
  const { data: listings, error: listingError } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('id', id)
    .limit(1);

  if (listingError) {
    logError('Error fetching listing', listingError, { listingId: id });
    return null;
  }

  const listing = Array.isArray(listings) ? listings[0] : null;

  if (!listing) {
    return null;
  }

  const { data: profile } = listing.user_id
    ? await supabase
        .from('profiles')
        // `profiles` es privado y no contiene campos públicos como public_name/avatar_url.
        // Esos viven en `public_profiles`. Aquí sólo traemos fallback mínimo.
        .select('id, first_name, last_name, plan_key')
        .eq('id', listing.user_id)
        .single()
    : { data: null };

  const publicProfileId = (listing as any)?.public_profile_id as string | null | undefined;
  const { data: publicProfile } = publicProfileId
    ? await supabase
        .from('public_profiles')
        .select('id, slug, public_name, avatar_url, contact_email, contact_phone, whatsapp, whatsapp_type')
        .eq('id', publicProfileId)
        .eq('status', 'active')
        .eq('is_public', true)
        .maybeSingle()
    : { data: null };

  const fallbackName = (() => {
    const first = typeof (profile as any)?.first_name === 'string' ? String((profile as any).first_name).trim() : '';
    const last = typeof (profile as any)?.last_name === 'string' ? String((profile as any).last_name).trim() : '';
    const full = `${first} ${last}`.replace(/\s+/g, ' ').trim();
    return full || 'Vendedor';
  })();

  const profileForUI: VehicleDetail['profiles'] = listing.user_id
    ? {
        id: String(listing.user_id),
        username: String(publicProfile?.slug ?? ''),
        public_name: String(publicProfile?.public_name ?? fallbackName),
        avatar_url: publicProfile?.avatar_url ?? null,
        description: null,
        website: null,
        address: null,
        plan: typeof (profile as any)?.plan_key === 'string' ? String((profile as any).plan_key) : ((profile as any)?.plan_key ?? null),
      }
    : null;

  const listingVehicle = firstOrNull<Record<string, any>>(listing.listings_vehicles);
  const vehicleType = firstOrNull<Record<string, any>>(listingVehicle?.vehicle_types);
  const brand = firstOrNull<Record<string, any>>(listingVehicle?.brands);
  const model = firstOrNull<Record<string, any>>(listingVehicle?.models);
  const region = firstOrNull<Record<string, any>>(listing.regions);
  const commune = firstOrNull<Record<string, any>>(listing.communes);

  const images: VehicleImageRow[] = (listing.images || []).sort((a: VehicleImageRow, b: VehicleImageRow) => {
    const posA = a.position ?? 0;
    const posB = b.position ?? 0;
    return posA - posB;
  });

  const imageUrls = images.map((img) => img.url);

  const metadata = listing.metadata || {};
  const specs = metadata?.specs || {};
  const features = metadata?.features || listingVehicle?.features || [];

  // Para la ficha pública: traducir códigos de equipamiento a labels desde features_catalog.
  // Mantener compatibilidad: si ya existe specs.equipment como strings (legacy), no lo pisamos.
  const featureCodes = Array.isArray(features) ? features : [];
  const equipmentLabels = await resolveEquipmentLabels(supabase, featureCodes);
  const equipmentItems = await resolveEquipmentItems(supabase, featureCodes);
  const computedSpecs = {
    ...specs,
    equipment_items: Array.isArray((specs as any)?.equipment_items) && (specs as any).equipment_items.length > 0
      ? (specs as any).equipment_items
      : equipmentItems,
    equipment: Array.isArray((specs as any)?.equipment) && (specs as any).equipment.length > 0
      ? (specs as any).equipment
      : equipmentLabels,
  };
  const rentMinDays = metadata?.rent_min_days ?? metadata?.rent?.min_days ?? metadata?.rent_terms?.min_days ?? null;
  const rentMaxDays = metadata?.rent_max_days ?? metadata?.rent?.max_days ?? metadata?.rent_terms?.max_days ?? null;
  const auctionCurrentBid = metadata?.auction_current_bid ?? metadata?.auction?.current_bid ?? null;
  const auctionBidCount = metadata?.auction_bid_count ?? metadata?.auction?.bid_count ?? null;
  const isFeatured = hasActiveBoost(listing.listing_boost_slots);
  const rentPricePeriod = (metadata?.rent_price_period ??
    (listing.rent_daily_price != null
      ? 'daily'
      : listing.rent_weekly_price != null
      ? 'weekly'
      : listing.rent_monthly_price != null
      ? 'monthly'
      : null)) as VehicleDetail['rent_price_period'];

  const contact_email = listing.contact_email ?? publicProfile?.contact_email ?? null;
  const contact_phone = listing.contact_phone ?? publicProfile?.contact_phone ?? null;
  const contact_whatsapp = listing.contact_whatsapp ?? publicProfile?.whatsapp ?? null;

  let public_documents: VehicleDetail['public_documents'] = [];
  try {
    const { data: docs } = await supabase
      .from('documents')
      .select('id, name, url, file_type, file_size')
      .eq('listing_id', listing.id)
      .eq('is_public', true)
      .order('created_at', { ascending: true });
    if (Array.isArray(docs)) {
      public_documents = docs.map((d: any) => ({
        id: String(d.id),
        name: d.name || 'documento',
        url: String(d.url || ''),
        file_type: d.file_type ?? null,
        file_size: typeof d.file_size === 'number' ? d.file_size : null,
      }));
    }
  } catch {
    public_documents = [];
  }

  return {
    id: listing.id,
    owner_id: listing.user_id,
    vertical_id: listing.vertical_id,
    company_id: (listing as any).company_id ?? null,
    listing_type: listing.listing_type,
    status: listing.status,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    currency: listing.currency,
    visibility: listing.visibility,
    is_featured: isFeatured,
    is_urgent: listing.is_urgent,
    allow_financing: listing.allow_financing,
    allow_exchange: listing.allow_exchange,
    region_id: listing.region_id,
    commune_id: listing.commune_id,
    tags: listing.tags,
    metadata,
    specs: computedSpecs,
    features,
    year: listingVehicle?.year ?? null,
    mileage: listingVehicle?.mileage ?? null,
    color: listingVehicle?.color ?? null,
    condition: listingVehicle?.condition ?? null,
    vehicle_type_id: listingVehicle?.vehicle_type_id ?? null,
    brand_id: listingVehicle?.brand_id ?? null,
    model_id: listingVehicle?.model_id ?? null,
    traction: listingVehicle?.traction ?? null,
    transmission: listingVehicle?.transmission ?? null,
    fuel_type: listingVehicle?.fuel_type ?? null,
    engine_size: listingVehicle?.engine_size ?? null,
    body_type: listingVehicle?.body_type ?? null,
    doors: listingVehicle?.doors != null ? Number(listingVehicle.doors) : null,
    seats: listingVehicle?.seats != null ? Number(listingVehicle.seats) : null,
    state: listingVehicle?.state ?? null,
    warranty: listingVehicle?.warranty ?? null,
    warranty_details: listingVehicle?.warranty_details ?? null,
    rent_price_period: rentPricePeriod,
    rent_daily_price: listing.rent_daily_price,
    rent_weekly_price: listing.rent_weekly_price,
    rent_monthly_price: listing.rent_monthly_price,
    rent_security_deposit: listing.rent_security_deposit,
    rent_min_days: rentMinDays,
    rent_max_days: rentMaxDays,
    auction_start_price: listing.auction_start_price,
    auction_start_at: listing.auction_start_at,
    auction_end_at: listing.auction_end_at,
    auction_current_bid: auctionCurrentBid,
    auction_bid_count: auctionBidCount,
    video_url: listing.video_url,
    document_urls: listing.document_urls,
    public_documents,
    created_at: listing.created_at,
    updated_at: listing.updated_at,
    published_at: listing.published_at,
    expires_at: listing.expires_at,
    images,
    image_urls: imageUrls,
    profiles: profileForUI,
    public_profile: publicProfile ?? null,
    contact_email,
    contact_phone,
    contact_whatsapp,
    vehicle_types: vehicleType
      ? {
          id: String(vehicleType.id),
          name: vehicleType.name ?? '',
          category: vehicleType.category ?? null,
          label: vehicleType.label ?? vehicleType.name ?? null,
        }
      : null,
    brands: brand ? { id: String(brand.id), name: brand.name ?? '' } : null,
    models: model ? { id: String(model.id), name: model.name ?? '' } : null,
    regions: region ? { id: String(region.id), name: region.name ?? '' } : null,
    communes: commune ? { id: String(commune.id), name: commune.name ?? '' } : null,
  };
}


