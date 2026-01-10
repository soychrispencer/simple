import { normalizeVehicleTypeSlug } from './vehicleTypeLegacyMap';

export type BaseVehicleCategoryKey =
  | 'car'
  | 'bus'
  | 'motorcycle'
  | 'truck'
  | 'machinery'
  | 'aerial'
  | 'nautical';

export const BASE_VEHICLE_CATEGORIES_ORDER: BaseVehicleCategoryKey[] = [
  'car',
  'bus',
  'truck',
  'machinery',
  'motorcycle',
  'aerial',
  'nautical',
];

export const BASE_VEHICLE_CATEGORY_LABEL: Record<BaseVehicleCategoryKey, string> = {
  car: 'Autos',
  bus: 'Buses',
  motorcycle: 'Motos',
  truck: 'Camiones',
  machinery: 'Maquinarias',
  aerial: 'Aéreos',
  nautical: 'Náuticos',
};

export const BASE_VEHICLE_CATEGORY_DESCRIPTION: Record<BaseVehicleCategoryKey, string> = {
  car: 'SUV, Pickup, Sedán, Hatchback, Coupé, Van…',
  bus: 'Microbús, Minibús, Bus de pasajeros…',
  motorcycle: 'Urbanas, Deportivas, Enduro, Scooter…',
  truck: 'Livianos y pesados, carga y trabajo…',
  machinery: 'Excavadora, Tractor, Retroexcavadora…',
  aerial: 'Avión, Helicóptero, Drone…',
  nautical: 'Lancha, Velero, Yate, Moto de agua…',
};

export type VehicleTypeCatalogRow = {
  id: string;
  slug: string;
  name: string;
  category?: string | null;
  sort_order?: number | null;
};

export type BaseVehicleCategoryOption = {
  key: BaseVehicleCategoryKey;
  label: string;
  description: string;
  ids: string[];
};

export type VehicleCategoryOption = {
  key: string;
  label: string;
  description: string;
  ids: string[];
};

function coerceBaseKey(value?: string | null): BaseVehicleCategoryKey | null {
  if (!value) return null;
  const trimmed = String(value).trim().toLowerCase();

  // Canonical
  if (trimmed === 'car') return 'car';
  if (trimmed === 'bus') return 'bus';
  if (trimmed === 'motorcycle') return 'motorcycle';
  if (trimmed === 'truck') return 'truck';
  if (trimmed === 'machinery') return 'machinery';
  if (trimmed === 'aerial') return 'aerial';
  if (trimmed === 'nautical') return 'nautical';

  // Back-compat / transitional keys
  if (trimmed === 'industrial') return 'machinery';

  return null;
}

function inferBaseKeyFromSlug(slug: string): BaseVehicleCategoryKey {
  const normalized = normalizeVehicleTypeSlug(slug) || slug;

  // normalizeVehicleTypeSlug returns sub-slugs (auto/suv/pickup/van/moto/camion/bus/maquinaria/...)
  if (['auto', 'suv', 'pickup', 'van'].includes(normalized)) return 'car';
  if (normalized === 'bus') return 'bus';
  if (normalized === 'moto') return 'motorcycle';
  if (normalized === 'camion') return 'truck';
  if (normalized === 'maquinaria') return 'machinery';
  if (normalized === 'aereo') return 'aerial';
  if (normalized === 'nautico') return 'nautical';

  return 'car';
}

export function buildBaseVehicleCategoryOptions(
  rows: VehicleTypeCatalogRow[]
): BaseVehicleCategoryOption[] {
  const byBase = new Map<BaseVehicleCategoryKey, BaseVehicleCategoryOption>();

  for (const row of rows) {
    const baseKey = coerceBaseKey(row.category) ?? inferBaseKeyFromSlug(row.slug);
    const existing = byBase.get(baseKey);

    if (!existing) {
      byBase.set(baseKey, {
        key: baseKey,
        label: BASE_VEHICLE_CATEGORY_LABEL[baseKey],
        description: BASE_VEHICLE_CATEGORY_DESCRIPTION[baseKey],
        ids: row.id ? [row.id] : [],
      });
    } else {
      if (row.id) existing.ids.push(row.id);
    }
  }

  // Ensure stable order and filter out empty categories
  return BASE_VEHICLE_CATEGORIES_ORDER
    .map((k) => byBase.get(k))
    .filter((v): v is BaseVehicleCategoryOption => !!v && v.ids.length > 0);
}

function normalizeCategoryKey(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleCase(value: string): string {
  const cleaned = value.replace(/[-_]+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(/\s+/g)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function inferCategoryFromSlug(slug: string): string {
  const normalized = normalizeVehicleTypeSlug(slug) || slug;
  const s = normalizeCategoryKey(normalized);

  // Compat con slugs legacy
  if (['auto', 'suv', 'pickup', 'van'].includes(s)) return 'car';
  if (s === 'bus') return 'bus';
  if (s === 'moto') return 'motorcycle';
  if (s === 'camion') return 'truck';
  if (s === 'maquinaria') return 'machinery';
  if (s === 'aereo') return 'aerial';
  if (s === 'nautico') return 'nautical';

  // Fallback: usar el slug normalizado como key de categoría
  return s || 'car';
}

function coerceLegacyCategoryKey(key: string): string {
  // Normaliza claves antiguas del backend a las 7 llaves base
  // (para que el UI no dependa de que ya corrieron migraciones).
  switch (key) {
    case 'passenger':
    case 'light-truck':
    case 'light_truck':
      return 'car';
    case 'transit':
      return 'bus';
    case 'heavy-truck':
    case 'heavy_truck':
      return 'truck';
    case 'industrial':
      return 'machinery';
    case 'other':
      // Evita una 8va categoría visible; cae dentro de Autos
      return 'car';
    default:
      return key;
  }
}

/**
 * Construye opciones de categorías desde la tabla vehicle_types.
 * - Agrupa por `category` (si viene vacío, infiere desde slug legacy)
 * - Mantiene labels/descripciones para las 7 categorías canónicas
 * - Incluye automáticamente categorías nuevas (sin tocar código)
 */
export function buildVehicleCategoryOptions(rows: VehicleTypeCatalogRow[]): VehicleCategoryOption[] {
  const byKey = new Map<
    string,
    {
      key: string;
      ids: string[];
      sampleNames: string[];
      minSort: number;
    }
  >();

  for (const row of rows) {
    const fromCategory = normalizeCategoryKey(row.category);
    const keyRaw = fromCategory || inferCategoryFromSlug(row.slug);
    const key = coerceLegacyCategoryKey(keyRaw);

    const sortOrder = typeof row.sort_order === 'number' ? row.sort_order : 0;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        key,
        ids: row.id ? [row.id] : [],
        sampleNames: row.name ? [row.name] : [],
        minSort: sortOrder,
      });
    } else {
      if (row.id) existing.ids.push(row.id);
      if (row.name && !existing.sampleNames.includes(row.name)) existing.sampleNames.push(row.name);
      if (sortOrder < existing.minSort) existing.minSort = sortOrder;
    }
  }

  const options: VehicleCategoryOption[] = Array.from(byKey.values())
    .filter((v) => v.ids.length > 0)
    .map((v) => {
      const known = coerceBaseKey(v.key as any) as BaseVehicleCategoryKey | null;
      const label = known ? BASE_VEHICLE_CATEGORY_LABEL[known] : titleCase(v.key) || 'Tipo';
      const description = known
        ? BASE_VEHICLE_CATEGORY_DESCRIPTION[known]
        : v.sampleNames.slice(0, 6).join(', ') + (v.sampleNames.length > 6 ? '…' : '');

      return { key: v.key, label, description, ids: v.ids };
    });

  const knownOrder = new Map<string, number>(
    BASE_VEHICLE_CATEGORIES_ORDER.map((k, idx) => [k, idx])
  );

  options.sort((a, b) => {
    const aKnown = knownOrder.has(a.key) ? (knownOrder.get(a.key) as number) : null;
    const bKnown = knownOrder.has(b.key) ? (knownOrder.get(b.key) as number) : null;
    if (aKnown != null && bKnown != null) return aKnown - bKnown;
    if (aKnown != null) return -1;
    if (bKnown != null) return 1;

    const aMeta = byKey.get(a.key);
    const bMeta = byKey.get(b.key);
    const aSort = aMeta?.minSort ?? 0;
    const bSort = bMeta?.minSort ?? 0;
    if (aSort !== bSort) return aSort - bSort;
    return a.label.localeCompare(b.label, 'es');
  });

  return options;
}
