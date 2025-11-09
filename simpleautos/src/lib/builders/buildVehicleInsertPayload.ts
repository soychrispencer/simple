
import { legacyToCanon } from '../../types/vehicle';
import { toEnglish, visibilityMap } from '../vehicleTranslations';

// Tipado ligero para no acoplar con todo el WizardContext directamente
interface BuildOptions {
  state: any; // Wizard state shape (flexible)
  images: any[]; // imágenes crudas (con .url | .dataUrl | .file y flag .main)
}

/**
 * Centraliza la creación del payload base para inserción de vehicle.
 * - Ordena imágenes colocando la principal primero.
 * - Normaliza color (generic -> null).
 * - Resuelve condition + condition_tags con fallbacks legacy.
 * - Duplica temporalmente en claves legacy state/status_tags para compatibilidad.
 * - Incluye specs/features dentro de extra_specs (no mezclamos aún columnas normalizadas pendientes).
 */
export function buildVehicleInsertPayload({ state, images }: BuildOptions) {
  const basic = state.basic || {};
  const vehicle = state.vehicle || {};
  const commercial = state.commercial || {};
  const media = state.media || {};

  const { estado, historial, condiciones } = legacyToCanon({ basic, vehicle, commercial });

  const ordered = [...(images||[])].sort((a:any,b:any) => (b.main?1:0) - (a.main?1:0));
  const image_urls = ordered.map((img:any) => img.url || img.dataUrl).filter(Boolean);

  const resolvedColorRaw = basic.color;
  const color = resolvedColorRaw === 'generic' ? null : resolvedColorRaw || null;

  const now = new Date().toISOString();

  const listingTypeRaw = state.listing_type || 'sale';
  const isAuction = listingTypeRaw === 'auction';
  const isRent = listingTypeRaw === 'rent';
  const rawVisibility = commercial.visibility || 'normal';
  const visibility = (toEnglish(visibilityMap, rawVisibility) || rawVisibility) as 'featured' | 'normal' | 'hidden';
  const isFeaturedVisibility = visibility === 'featured';
  const discountPercent = (() => {
    const p = commercial.price;
    const o = commercial.offer_price;
    if (p && o && o < p) return Math.floor(((p - o) / p) * 100);
    return null;
  })();
  const offerPrice = (() => {
    const raw = commercial.offer_price;
    return typeof raw === 'number' && isFinite(raw) ? raw : null;
  })();

  // Mapear estado del vehículo (nuevo/usado/seminuevo) a valores de BD (new/used/certified)
  const conditionMap: Record<string, string> = {
    'nuevo': 'new',
    'usado': 'used',
    'seminuevo': 'certified'
  };
  const dbCondition = (estado && conditionMap[estado.toLowerCase()]) || 'unknown';

  // Status de publicación: leer de state.publication_status o default 'draft'
  const publicationStatus = state.publication_status || 'draft';

  // Sanitizar descripción antes de guardar
  let sanitizedDescription = basic.description || null;
  try {
    if (sanitizedDescription) {
      // Import dinámico para evitar problemas SSR
      const DOMPurify = require('isomorphic-dompurify');
      sanitizedDescription = DOMPurify.sanitize(sanitizedDescription);
    }
  } catch (e) {
    // Si falla la sanitización, guardar el texto original
  }
  const base: any = {
    listing_type: listingTypeRaw,
    title: basic.title,
    description: sanitizedDescription,
    year: basic.year ?? null,
    brand_id: basic.brand_id || null,
    model_id: basic.model_id || null,
    price: commercial.price ?? null,
    mileage: basic.mileage ?? null,
    type_id: vehicle.type_id || null,
    // Guardamos specs y features sólo en extra_specs por ahora
    extra_specs: {
      ...(vehicle.specs || {}),
      // Normalizamos color dentro de extra_specs (no existe columna top-level 'color')
      color,
      features: vehicle.features || [],
      estado,
      historial,
      condiciones,
      discount_percent: discountPercent,
      offer_price: offerPrice,
      discount_type: commercial.discount_type || null,
      discount_valid_until: commercial.discount_valid_until || null,
      type_key: vehicle.type_key || null,
      main_image: image_urls[0] || null,
      location: {
        region_id: basic.region ?? null,
        region_name: basic.region_name ?? null,
        commune_id: basic.commune ?? null,
        commune_name: basic.commune_name ?? null,
      },
      rent_price_period: commercial.rent_price_period ?? null,
      // LEGACY (mantener mientras se limpian consumidores anteriores)
      condition: estado,
      condition_tags: historial,
      commercial_conditions: condiciones,
      // LEGACY
      state: estado,
      status_tags: historial,
    },
    region_id: basic.region ?? null,
    commune_id: basic.commune ?? null,
    image_urls,
  visibility,
    featured: isFeaturedVisibility,
    status: publicationStatus, // 'active' o 'draft' según lo que eligió el usuario
    condition: dbCondition, // Estado del vehículo: new/used/certified/unknown
    allow_financing: !!commercial.financing_available,
    allow_exchange: !!commercial.exchange_considered,
    document_urls: Array.isArray(media.documents) ? media.documents : [],
    // Campos condicionales (solo incluir si existe columna en esquema o si se migrará luego):
    ...(isRent ? {
      rent_daily_price: commercial.rent_daily_price ?? null,
      rent_weekly_price: commercial.rent_weekly_price ?? null,
      rent_monthly_price: commercial.rent_monthly_price ?? null,
      rent_security_deposit: commercial.rent_security_deposit ?? null,
    } : {}),
    ...(isAuction ? {
      auction_start_price: commercial.auction_start_price ?? null,
      auction_start_at: commercial.auction_start_at || null,
      auction_end_at: commercial.auction_end_at || null,
    } : {}),
    video_url: media.video_url || null,
    created_at: now,
    updated_at: now,
  };

  return base;
}

export type VehicleInsertPayload = ReturnType<typeof buildVehicleInsertPayload>;