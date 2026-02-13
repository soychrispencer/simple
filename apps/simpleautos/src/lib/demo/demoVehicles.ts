import type { VehicleRow } from '@/lib/searchVehicles';
import type { VehicleDetail } from '@/lib/getVehicleById';

export type DemoListingsMode = 'off' | 'fallback' | 'always';

export function getDemoListingsMode(): DemoListingsMode {
  const raw = String(process.env.NEXT_PUBLIC_SHOW_DEMO_LISTINGS || '').toLowerCase().trim();
  if (raw === 'always') return 'always';
  if (raw === 'true' || raw === '1' || raw === 'yes') return 'fallback';
  return 'off';
}

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

function int(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function roundTo(value: number, step: number): number {
  const s = Math.max(1, step);
  return Math.round(value / s) * s;
}

function getCarImages(brand: string, model: string, count: number): string[] {
  const searchTerm = `${brand} ${model}`.toLowerCase().replace(/\s+/g, '-');
  const baseUrl = 'https://images.unsplash.com/photo';
  
  // Banco de imágenes validadas (IDs persistentes tipo 15.../16...).
  // Se agrupan por tipo visual para asegurar consistencia si falta el modelo exacto.
  const verifiedImages = {
    // Sedanes / Hatchbacks
    sedan_white: ['1576608570174-eb1fa8f3aaf9', '1596429916858-6f97b5b9cf48', '1583267746881-5e9632b81ac2'],
    sedan_black: ['1552519507-da3b142c6e3d', '1542282088033-d00ae6c7b1e4', '1562614528-47b2bcb5ee1c'],
    sedan_grey:  ['1568605114967-8130f3a36994', '1494976388531-d1058494cdd8', '1598433172410-db03e665ee25'],
    hatch_red:   ['1566432657434-f251c221e06d', '1542282088033-d00ae6c7b1e4', '1562614528-47b2bcb5ee1c'],
    
    // SUVs
    suv_white:   ['1511919884226-fd3cad34687c', '1605559424843-9e4c2c143b76', '1606664515524-ed2f786a0cf6'],
    suv_grey:    ['1533473359331-0135ef1b58bf', '1664695710557-3e013cb21302', '1664442990149-8ea838d09de0'],
    suv_black:   ['1575090536203-2a6193126514', '1633534882194-e0ce5e99990b', '1609521263047-f8f205293f24'],
  
    // Pickups
    pickup_generic: ['1559416523-140ddc3d238c', '1544468607-e7b3e848ff87', '1561200717-b7afef4de874'],
    pickup_action:  ['1617788138017-80ad40651399', '1590043586864-d05a4ff3ec08', '1562519819-b5e0b869c0e5'],
  
    // Premium / Specific
    bmw_sedan:   ['1559285694-6355b5a41cd8', '1550861748-db39dee4b657', '1562614528-47b2bcb5ee1c'],
    ford_focus:  ['1622345717326-8c50d859b8a8', '1598514805727-463e2af21379'],
  };
  
  // Mapeo específico Marca-Modelo -> Grupo visual
  // Esto asegura que una "Hilux" siempre tenga foto de Pickup, un "Corolla" de Sedán, etc.
  const modelMapping: Record<string, string[]> = {
    // Toyota
    'toyota-corolla': verifiedImages.sedan_white,
    'toyota-rav4': verifiedImages.suv_white,
    'toyota-hilux': verifiedImages.pickup_generic,
    'toyota-yaris': verifiedImages.sedan_grey,
    
    // Hyundai
    'hyundai-accent': verifiedImages.sedan_black,
    'hyundai-tucson': verifiedImages.suv_grey,
    'hyundai-santa-fe': verifiedImages.suv_black,
    'hyundai-creta': verifiedImages.suv_white, // Creta ~ SUV Small
    
    // Kia
    'kia-rio': verifiedImages.hatch_red,
    'kia-sportage': verifiedImages.suv_grey,
    'kia-seltos': verifiedImages.suv_white,
    'kia-sorento': verifiedImages.suv_black,
    
    // Nissan
    'nissan-versa': verifiedImages.sedan_grey,
    'nissan-sentra': verifiedImages.sedan_black,
    'nissan-x-trail': verifiedImages.suv_grey,
    'nissan-navara': verifiedImages.pickup_action,
    
    // Chevrolet
    'chevrolet-spark': verifiedImages.hatch_red,
    'chevrolet-onix': verifiedImages.sedan_white,
    'chevrolet-tracker': verifiedImages.suv_white,
    'chevrolet-d-max': verifiedImages.pickup_generic,
    
    // Mazda
    'mazda-mazda-3': verifiedImages.sedan_black,
    'mazda-cx-5': verifiedImages.suv_grey,
    'mazda-cx-30': verifiedImages.suv_black,
    
    // VW
    'volkswagen-gol': verifiedImages.hatch_red,
    'volkswagen-polo': verifiedImages.sedan_grey,
    'volkswagen-t-cross': verifiedImages.suv_white,
    'volkswagen-tiguan': verifiedImages.suv_black,
    
    // Honda
    'honda-civic': verifiedImages.sedan_black,
    'honda-cr-v': verifiedImages.suv_white,
    'honda-hr-v': verifiedImages.suv_grey,
    
    // Ford
    'ford-fiesta': verifiedImages.hatch_red,
    'ford-focus': verifiedImages.ford_focus,
    'ford-ranger': verifiedImages.pickup_action,
    'ford-territory': verifiedImages.suv_black,
    
    // BMW
    'bmw-320i': verifiedImages.bmw_sedan,
    'bmw-x1': verifiedImages.suv_white,
    'bmw-x3': verifiedImages.suv_black,
  };

  const imageIds = modelMapping[searchTerm] || verifiedImages.sedan_white;
  const urls: string[] = [];
  
  for (let i = 0; i < Math.min(count, imageIds.length); i++) {
    urls.push(`${baseUrl}-${imageIds[i]}?auto=format&fit=crop&w=1000&q=80`);
  }
  
  while (urls.length < count && imageIds.length > 0) {
    const idx = urls.length % imageIds.length;
    urls.push(`${baseUrl}-${imageIds[idx]}?auto=format&fit=crop&w=1000&q=80`);
  }
  
  return urls.length ? urls : ['/hero-cars.jpg'];
}

const DEMO_REGIONS: Array<{ name: string; communes: string[] }> = [
  { name: 'Metropolitana de Santiago', communes: ['Las Condes', 'Providencia', 'Ñuñoa', 'Santiago'] },
  { name: 'Valparaíso', communes: ['Viña del Mar', 'Valparaíso', 'Quilpué'] },
  { name: 'Biobío', communes: ['Concepción', 'Talcahuano', 'Los Ángeles'] },
  { name: 'Coquimbo', communes: ['La Serena', 'Coquimbo'] },
  { name: 'Araucanía', communes: ['Temuco', 'Villarrica'] },
  { name: 'Los Lagos', communes: ['Puerto Montt', 'Osorno'] },
];

const DEMO_TYPES: Array<{ slug: string; label: string }> = [
  { slug: 'auto', label: 'Auto' },
  { slug: 'suv', label: 'SUV' },
  { slug: 'pickup', label: 'Pickup' },
  { slug: 'moto', label: 'Moto' },
];

const DEMO_FUEL_TYPES = ['gasoline', 'diesel', 'hybrid', 'electric'] as const;
const DEMO_TRANSMISSIONS = ['manual', 'automatic', 'cvt'] as const;
const DEMO_COLORS = ['blanco', 'negro', 'gris', 'plata', 'azul', 'rojo'] as const;

const DEMO_BRANDS: Array<{ brand: string; models: string[] }> = [
  { brand: 'Toyota', models: ['Corolla', 'RAV4', 'Hilux', 'Yaris'] },
  { brand: 'Hyundai', models: ['Accent', 'Tucson', 'Santa Fe', 'Creta'] },
  { brand: 'Kia', models: ['Rio', 'Sportage', 'Seltos', 'Sorento'] },
  { brand: 'Nissan', models: ['Versa', 'Sentra', 'X-Trail', 'Navara'] },
  { brand: 'Chevrolet', models: ['Spark', 'Onix', 'Tracker', 'D-Max'] },
  { brand: 'Mazda', models: ['Mazda 3', 'CX-5', 'CX-30'] },
  { brand: 'Volkswagen', models: ['Gol', 'Polo', 'T-Cross', 'Tiguan'] },
  { brand: 'Honda', models: ['Civic', 'CR-V', 'HR-V'] },
  { brand: 'Ford', models: ['Fiesta', 'Focus', 'Ranger', 'Territory'] },
  { brand: 'BMW', models: ['320i', 'X1', 'X3'] },
];

const SELLERS = [
  { username: 'autos_santiago', public_name: 'Autos Santiago' },
  { username: 'premium_motors', public_name: 'Premium Motors' },
  { username: 'vendo_mi_auto', public_name: 'Vendo Mi Auto' },
  { username: 'ofertas_cl', public_name: 'Ofertas CL' },
  { username: 'auto_market', public_name: 'Auto Market' },
] as const;

export function isDemoListingsEnabled(): boolean {
  return getDemoListingsMode() !== 'off';
}

export function getDemoVehicleRows(options?: {
  count?: number;
  includeFeaturedMix?: boolean;
  seed?: number;
}): VehicleRow[] {
  const count = options?.count ?? 50;
  const includeFeaturedMix = options?.includeFeaturedMix ?? true;
  const seed = options?.seed ?? 20260113;

  const rng = mulberry32(seed);
  const rows: VehicleRow[] = [];

  for (let i = 0; i < count; i++) {
    const listing_type = pick(rng, ['sale', 'rent', 'auction'] as const);
    const type = pick(rng, DEMO_TYPES);
    const brand = pick(rng, DEMO_BRANDS);
    const model = pick(rng, brand.models);
    const region = pick(rng, DEMO_REGIONS);
    const commune = pick(rng, region.communes);
    const year = int(rng, 2012, 2024);
    const mileage = int(rng, 8_000, 180_000);

    const condition = year >= 2023 && mileage < 1_500 ? 'new' : 'used';
    const fuel_type = pick(rng, DEMO_FUEL_TYPES);
    const transmission = pick(rng, DEMO_TRANSMISSIONS);
    const color = pick(rng, DEMO_COLORS);

    const isFeatured = includeFeaturedMix ? rng() < 0.28 : true;
    const visibility = isFeatured ? 'featured' : 'normal';

    const saleBase = int(rng, 4_200_000, 28_900_000);
    const rentBase = int(rng, 20_000, 180_000);
    const priceBase =
      listing_type === 'sale'
        ? roundTo(saleBase, 100_000)
        : roundTo(rentBase, 1_000);

    const seller = pick(rng, SELLERS);

    const galleryCount = int(rng, 2, 4);
    const image_paths = getCarImages(brand.brand, model, galleryCount);

    rows.push({
      id: `demo-${listing_type}-${i + 1}`,
      title: `${brand.brand} ${model} ${year}`,
      listing_type,
      user_id: null,
      owner_id: `demo-owner-${(i % 5) + 1}`,
      price: listing_type === 'sale' ? priceBase : null,
      year,
      mileage,
      type_id: `demo-type-${type.slug}`,
      body_type: type.slug === 'suv' ? 'suv' : type.slug === 'pickup' ? 'pickup' : null,
      created_at: isoDaysAgo(int(rng, 1, 45)),
      image_paths,
      allow_financing: rng() < 0.45,
      allow_exchange: rng() < 0.18,
      featured: isFeatured,
      visibility,
      contact_email: 'demo@simpleautos.app',
      contact_phone: null,
      contact_whatsapp: null,
      rent_daily_price: listing_type === 'rent' ? priceBase : null,
      rent_weekly_price: listing_type === 'rent' ? roundTo(Math.round(priceBase * 6.2), 5_000) : null,
      rent_monthly_price: listing_type === 'rent' ? roundTo(Math.round(priceBase * 22), 10_000) : null,
      rent_price_period: listing_type === 'rent' ? pick(rng, ['daily', 'weekly', 'monthly'] as const) : null,
      rent_security_deposit: listing_type === 'rent' ? roundTo(int(rng, 150_000, 900_000), 50_000) : null,
      auction_start_price: listing_type === 'auction' ? roundTo(int(rng, 2_000_000, 14_000_000), 100_000) : null,
      auction_start_at: listing_type === 'auction' ? isoDaysAgo(int(rng, 1, 5)) : null,
      auction_end_at: listing_type === 'auction' ? isoDaysAgo(-int(rng, 1, 7)) : null,
      region_id: null,
      commune_id: null,
      profiles: {
        username: seller.username,
        public_name: seller.public_name,
        avatar_url: null,
      },
      communes: { name: commune },
      regions: { name: region.name },
      vehicle_types: {
        slug: type.slug,
        label: type.label,
      },
      specs: {
        condition,
        fuel_type,
        transmission,
        color,
        legacy: {
          brand_name: brand.brand,
          model_name: model,
          region_name: region.name,
          commune_name: commune,
          fuel_legacy: fuel_type,
          transmission_legacy: transmission,
        },
      },
      metadata: {
        demo: true,
        demo_seed: seed,
      },
    });
  }

  return rows;
}

export function getDemoFeaturedVehicleRows(options: {
  listingType: 'sale' | 'rent' | 'auction';
  count?: number;
  seed?: number;
}): VehicleRow[] {
  const all = getDemoVehicleRows({
    count: 60,
    includeFeaturedMix: false,
    seed: options.seed ?? 20260113,
  });

  return all.filter((r) => r.listing_type === options.listingType).slice(0, options.count ?? 12);
}

export function getDemoVehicleDetail(id: string): VehicleDetail | null {
  if (!id?.startsWith('demo-')) return null;

  // Reutilizamos la misma fuente para que el detalle coincida con el listado.
  const all = getDemoVehicleRows({ count: 50, includeFeaturedMix: true, seed: 20260113 });
  const row = all.find((r) => r.id === id);
  if (!row) return null;

  const imagePaths: string[] = Array.isArray((row as any).image_paths)
    ? ((row as any).image_paths as string[])
    : (row as any).image_paths
    ? [String((row as any).image_paths)].filter(Boolean)
    : [];

  const images = (imagePaths.length ? imagePaths : ['/hero-cars.jpg']).map((url, idx) => ({
    url,
    position: idx + 1,
    is_primary: idx === 0,
    alt_text: null,
    caption: null,
  }));

  const condition = (row.specs as any)?.condition ?? 'used';
  const fuel_type = (row.specs as any)?.fuel_type ?? null;
  const transmission = (row.specs as any)?.transmission ?? null;
  const color = (row.specs as any)?.color ?? null;

  return {
    id: row.id,
    owner_id: row.owner_id ?? null,
    vertical_id: null,
    company_id: null,
    listing_type: row.listing_type,
    status: 'published',
    title: row.title,
    description:
      'Publicación de ejemplo (demo). Sirve solo para mostrar cómo se ve la plataforma con contenido.\n\nSi te interesa este vehículo, contáctanos y te ayudamos a encontrar opciones reales.',
    price: row.listing_type === 'sale' ? row.price : null,
    currency: 'CLP',
    visibility: row.visibility || 'normal',
    is_featured: Boolean(row.featured),
    is_urgent: false,
    allow_financing: Boolean(row.allow_financing),
    allow_exchange: Boolean(row.allow_exchange),
    region_id: null,
    commune_id: null,
    tags: ['demo'],
    metadata: row.metadata ?? { demo: true },
    specs: row.specs ?? {},
    features: [],
    year: row.year,
    mileage: row.mileage,
    color,
    condition,
    vehicle_type_id: row.type_id,
    brand_id: null,
    model_id: null,
    traction: null,
    transmission,
    fuel_type,
    body_type: row.body_type ?? null,
    doors: null,
    seats: null,
    rent_price_period: (row.rent_price_period as any) ?? null,
    rent_daily_price: row.rent_daily_price ?? null,
    rent_weekly_price: row.rent_weekly_price ?? null,
    rent_monthly_price: row.rent_monthly_price ?? null,
    rent_security_deposit: row.rent_security_deposit ?? null,
    auction_start_price: row.auction_start_price ?? null,
    auction_start_at: row.auction_start_at ?? null,
    auction_end_at: row.auction_end_at ?? null,
    auction_current_bid: null,
    auction_bid_count: null,
    video_url: null,
    document_urls: [],
    public_documents: [],
    created_at: row.created_at,
    updated_at: row.created_at,
    published_at: row.created_at,
    expires_at: null,
    images,
    image_urls: images.map((i) => i.url),
    profiles: row.profiles
      ? {
          id: row.owner_id ?? 'demo-owner',
          username: row.profiles.username,
          public_name: row.profiles.public_name,
          avatar_url: row.profiles.avatar_url ?? null,
          description: 'Cuenta demo',
          website: null,
          address: null,
          plan: 'pro',
        }
      : null,
    public_profile: null,
    contact_email: row.contact_email ?? null,
    contact_phone: row.contact_phone ?? null,
    contact_whatsapp: row.contact_whatsapp ?? null,
    vehicle_types: row.vehicle_types
      ? {
          id: row.type_id,
          name: row.vehicle_types.label,
          label: row.vehicle_types.label,
          category: undefined,
        }
      : null,
    brands: null,
    models: null,
    regions: row.regions ? { id: 'demo-region', name: row.regions.name } : null,
    communes: row.communes ? { id: 'demo-commune', name: row.communes.name } : null,
  };
}
