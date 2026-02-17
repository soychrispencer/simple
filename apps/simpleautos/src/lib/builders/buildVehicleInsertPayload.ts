import { legacyToCanon } from '../../types/vehicle';

interface BuildOptions {
  state: any;
  images: any[];
}

interface BuildVehicleInsertResult {
  listing: Record<string, any>;
  vehicle: Record<string, any>;
}

const STATUS_MAP: Record<string, 'draft' | 'published' | 'inactive' | 'sold'> = {
  draft: 'draft',
  published: 'published',
  active: 'published',
  paused: 'inactive',
  inactive: 'inactive',
  sold: 'sold',
};

const CONDITION_MAP: Record<string, string> = {
  nuevo: 'nuevo',
  demo: 'demo',
  seminuevo: 'seminuevo',
  usado: 'usado',
  restored: 'restaurado',
  restaurado: 'restaurado',
  accident: 'siniestrado',
  siniestrado: 'siniestrado',
  'to-repair': 'para-reparar',
  'para-reparar': 'para-reparar',
  parts: 'para-repuestos',
  'para-repuestos': 'para-repuestos',
};

const TRANSMISSION_MAP: Record<string, string> = {
  manual: 'manual',
  automatica: 'automatica',
  automatic: 'automatica',
  cvt: 'automatica',
  dual_clutch: 'automatica',
};

const FUEL_MAP: Record<string, string> = {
  gasolina: 'gasolina',
  diesel: 'diesel',
  electrico: 'electrico',
  electric: 'electrico',
  hybrid: 'hibrido',
  hibrido: 'hibrido',
  cng: 'gas_natural',
  gas_natural: 'gas_natural',
  lpg: 'gas_lp',
  gas_lp: 'gas_lp',
};

const TRACTION_MAP: Record<string, string> = {
  '4x2': '4x2',
  '4x4': '4x4',
  '4wd': '4x4',
  awd: 'awd',
  fwd: 'fwd',
  rwd: 'rwd',
};

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj || {}).filter(([, value]) => value !== undefined)
  ) as T;
}

function sanitizeDescription(raw?: string | null) {
  if (!raw) return null;
  try {
    const DOMPurify = require('isomorphic-dompurify');
    return DOMPurify.sanitize(raw);
  } catch {
    return raw;
  }
}

function mapCondition(value?: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return CONDITION_MAP[normalized] ?? null;
}

function mapTransmission(value?: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return TRANSMISSION_MAP[normalized] ?? null;
}

function mapFuel(value?: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return FUEL_MAP[normalized] ?? null;
}

function mapTraction(value?: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return TRACTION_MAP[normalized] ?? null;
}

function formatEngineSizeFromCc(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const liters = value / 1000;
  // 1998cc -> 2.0L (1 decimal)
  return `${liters.toFixed(1)}L`;
}

function normalizeColor(raw?: string | null) {
  if (!raw || raw === 'generic') return null;
  return raw;
}

function buildGeneratedTitle(basic: Record<string, any>) {
  const brandName = basic?.brand_name;
  const modelName = basic?.model_name;
  const year = basic?.year;
  const color = basic?.color;
  if (!brandName || !modelName || year == null || !color || color === 'generic') return '';
  return [String(brandName), String(modelName), String(year), String(color)].join(' ');
}

function buildMetadata({
  specs,
  historial,
  condiciones,
  estado,
  basic,
  vehicle,
  commercial,
}: {
  specs: Record<string, any>;
  historial: string[];
  condiciones: Record<string, any>;
  estado: string | null;
  basic: Record<string, any>;
  vehicle: Record<string, any>;
  commercial: Record<string, any>;
}) {
  const location = cleanUndefined({
    region_id: basic.region ?? null,
    region_name: basic.region_name ?? null,
    commune_id: basic.commune ?? null,
    commune_name: basic.commune_name ?? null,
    address: basic.address ?? null,
  });

  const legacy = cleanUndefined({
    commune_name: location.commune_name ?? null,
    region_name: location.region_name ?? null,
    fuel_legacy: specs.fuel_type ?? null,
    transmission_legacy: specs.transmission ?? null,
  });

  return cleanUndefined({
    specs,
    historial,
    condiciones,
    estado,
    condition: estado,
    condition_tags: historial,
    status_tags: historial,
    commercial_conditions: condiciones,
    location,
    legacy,
    features: vehicle.features || [],
    type_key: vehicle.type_key || null,
    type_id: vehicle.type_id || null,
    rent_price_period: commercial.rent_price_period ?? null,
    rent_daily_price: commercial.rent_daily_price ?? null,
    rent_weekly_price: commercial.rent_weekly_price ?? null,
    rent_monthly_price: commercial.rent_monthly_price ?? null,
    rent_security_deposit: commercial.rent_security_deposit ?? null,
    discount: cleanUndefined({
      offer_price: null,
      discount_type: null,
      discount_valid_until: null,
    }),
    advanced_conditions: commercial.advanced_conditions ?? null,
    trade_in: commercial.exchange_considered
      ? {
          accepts: commercial.exchange_accepts ?? null,
          balance: commercial.exchange_balance ?? null,
        }
      : null,
    main_image: null,
    gallery: [],
  });
}

export function buildVehicleInsertPayload({ state }: BuildOptions): BuildVehicleInsertResult {
  const basic = state.basic || {};
  const vehicle = state.vehicle || {};
  const commercial = state.commercial || {};
  const media = state.media || {};

  const resolvedVehicleTypeId: string | null =
    (vehicle.type_id as string | null | undefined) ??
    (Array.isArray(vehicle.type_ids) && vehicle.type_ids.length > 0
      ? (vehicle.type_ids[0] as string)
      : null);

  const { estado, historial, condiciones } = legacyToCanon({ basic, vehicle, commercial });
  const normalizedStatus = STATUS_MAP[state.publication_status || 'draft'] ?? 'draft';
  const listingType = state.listing_type || 'sale';
  // La visibilidad no se controla desde el wizard: para ocultar existe "Pausar"; para destacar existe "Impulsar".
  // Mantener siempre "normal" para evitar inconsistencias con boost/pagos.
  const visibility: 'normal' = 'normal';
  const isPublished = normalizedStatus === 'published';
  const now = new Date().toISOString();

  const specs = { ...(vehicle.specs || {}) };

  // Casa rodante: antes era un spec boolean; ahora es una carrocería (body_type).
  if ((specs as any).is_motorhome) {
    if (!(specs as any).body_type) (specs as any).body_type = 'motorhome';
    delete (specs as any).is_motorhome;
  }
  // Garantía: ya no se toma desde specs (Paso 3). Se maneja como etiqueta (warranty) y/o condición comercial (garantía del vendedor).
  delete (specs as any).warranty;
  delete (specs as any).warranty_details;
  const metadata = buildMetadata({
    specs,
    historial,
    condiciones,
    estado,
    basic,
    vehicle: { ...vehicle, type_id: resolvedVehicleTypeId },
    commercial,
  });

  const documentUrls = (() => {
    const raw = (media as any)?.documents;
    if (!Array.isArray(raw) || raw.length === 0) return [] as string[];
    // Legacy/compat: antes podía ser string[]
    if (typeof raw[0] === 'string') {
      return (raw as any[]).filter((v) => typeof v === 'string' && v.trim().length > 0) as string[];
    }
    // Nuevo: objetos con { path | url }
    const out: string[] = [];
    for (const it of raw as any[]) {
      if (it && typeof it === 'object' && it.is_public === false) continue;
      const candidate = typeof it?.url === 'string' ? it.url : (typeof it?.path === 'string' ? it.path : null);
      if (candidate && candidate.trim().length) out.push(candidate);
    }
    return out;
  })();

  const listing = cleanUndefined({
    vertical_id: vehicle.vertical_id ?? null,
    user_id: null,
    company_id: null,
    listing_type: listingType,
    title: basic.title || buildGeneratedTitle(basic) || '',
    description: sanitizeDescription(basic.description || null),
    price: commercial.price ?? null,
    currency: 'CLP',
    status: normalizedStatus,
    visibility,
    allow_financing: !!commercial.financing_available,
    allow_exchange: !!commercial.exchange_considered,
    rent_daily_price: commercial.rent_daily_price ?? null,
    rent_weekly_price: commercial.rent_weekly_price ?? null,
    rent_monthly_price: commercial.rent_monthly_price ?? null,
    rent_security_deposit: commercial.rent_security_deposit ?? null,
    auction_start_price: commercial.auction_start_price ?? null,
    auction_start_at: commercial.auction_start_at || null,
    auction_end_at: commercial.auction_end_at || null,
    video_url: media.video_url || null,
    document_urls: documentUrls,
    region_id: basic.region ?? null,
    commune_id: basic.commune ?? null,
    tags: [],
    metadata,
    views: 0,
    published_at: isPublished ? now : null,
    created_at: now,
    updated_at: now,
  });

  const color = normalizeColor(basic.color);
  const vehiclePayload = cleanUndefined({
    listing_id: null,
    vehicle_type_id: resolvedVehicleTypeId ?? null,
    brand_id: basic.brand_id ?? null,
    model_id: basic.model_id ?? null,
    year: basic.year ?? null,
    mileage: basic.mileage ?? null,
    transmission: mapTransmission(specs.transmission || specs.transmision),
    fuel_type: mapFuel(specs.fuel_type || specs.combustible),
    traction: mapTraction(specs.traction || specs.traccion || specs.drivetrain),
    engine_size: specs.engine_size || specs.cilindrada || formatEngineSizeFromCc((specs as any).engine_displacement_cc) || null,
    color,
    body_type: specs.body_type || specs.carroceria || null,
    doors: specs.doors ?? specs.puertas ?? null,
    seats: specs.seats ?? specs.asientos ?? null,

    // Náutico (columnas dedicadas en listings_vehicles)
    nautical_type: specs.nautical_type ?? null,
    nautical_length_m: specs.length_m ?? null,
    nautical_beam_m: specs.beam_m ?? null,
    nautical_engine_hours: specs.engine_hours ?? null,
    nautical_propulsion: specs.propulsion ?? null,
    nautical_hull_material: specs.hull_material ?? null,
    nautical_passengers: specs.passengers ?? null,
    nautical_cabins: specs.cabins ?? null,

    // Aéreo (columnas dedicadas en listings_vehicles)
    aerial_type: specs.aerial_type ?? null,
    aerial_flight_hours: specs.flight_hours ?? null,
    aerial_engine_count: specs.engine_count ?? null,
    aerial_registration: specs.registration ?? null,
    aerial_max_takeoff_weight_kg: specs.max_takeoff_weight_kg ?? null,
    aerial_range_km: specs.range_km ?? null,

    condition: mapCondition(estado),
    state: specs.state ?? null,
    features: vehicle.features || [],
  });

  return { listing, vehicle: vehiclePayload };
}

export type VehicleInsertPayload = BuildVehicleInsertResult;

