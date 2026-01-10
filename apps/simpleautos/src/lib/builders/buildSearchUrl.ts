import { listingKindMap, toEnglish } from '../vehicleTranslations';

export interface UISearchFilters {
  listing_kind?: string; // venta | arriendo | subasta (es)
  type_key?: string;     // auto | suv ... (es)
  brand_id?: string;
  model_id?: string;
  region_id?: string;
  commune_id?: string;
  [key: string]: any;
}

/**
 * Construye path + query string limpio dado filtros UI.
 * - Determina ruta base por listing_kind
 * - Normaliza enums a español en URL (para SEO) pero permite luego convertir a inglés.
 * - Elimina valores vacíos/null/undefined
 */
export function buildSearchUrl(filters: UISearchFilters) {
  const kind = (filters.listing_kind || 'venta').toLowerCase();
  let base = '/ventas';
  if (kind === 'arriendo') base = '/arriendos';
  else if (kind === 'subasta') base = '/subastas';
  else if (kind === 'todos') base = '/vehiculos';

  const cleaned: Record<string,string> = {};
  for (const [k,v] of Object.entries(filters)) {
    if (v === undefined || v === null) continue;
    const sv = String(v).trim();
    if (!sv || sv === 'null' || sv === 'undefined') continue;
    cleaned[k] = sv;
  }

  // listing_kind se deduce por la ruta; lo removemos para URL más limpia
  delete cleaned.listing_kind;

  const qs = new URLSearchParams(cleaned).toString();
  return qs ? `${base}?${qs}` : base;
}

/** Normaliza solo listing_kind a inglés para consultas */
export function normalizeKindForQuery(kindEs?: string) {
  const normalized = toEnglish(listingKindMap, kindEs || 'venta');
  return normalized === 'all' ? undefined : normalized;
}


