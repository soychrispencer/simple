/**
 * Constantes globales del ecosistema Simple
 */

import type { VerticalName } from './theme';
import {
  DOMAIN_PLAN_CAPABILITIES,
  getPlanCapabilities,
  getPlanMaxActiveListings,
  normalizePlanKey,
  type AnyPlanKey,
  type PlanCapabilities,
  type UnifiedPlanKey
} from '@simple/shared-types';

export const APP_NAME = 'Simple';
export const SUPPORT_EMAIL = 'support@simple.com';
export const CONTACT_EMAIL = 'contacto@simple.com';

// Pagination
export const ITEMS_PER_PAGE = 20;
export const MAX_ITEMS_PER_PAGE = 100;

// Limits
export const MAX_IMAGES_PER_LISTING = 20;
export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 5000;

// Free tier limits
export const FREE_TIER_MAX_ACTIVE_LISTINGS = getPlanMaxActiveListings('free');
export const FREE_TIER_MAX_IMAGES_PER_LISTING = 10;

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9990, // CLP/mes
    maxActiveListings: 10,
    maxImagesPerListing: 20,
    features: [
      'Hasta 10 publicaciones activas',
      'Activa tu página pública',
      'Estadísticas',
    ],
  },
  business: {
    id: 'business',
    name: 'Empresa',
    price: 39990, // CLP/mes
    maxActiveListings: DOMAIN_PLAN_CAPABILITIES.enterprise.maxActiveListings, // Ilimitado
    maxImagesPerListing: DOMAIN_PLAN_CAPABILITIES.enterprise.maxImagesPerListing,
    features: [
      'Próximamente: multiusuario (equipo)',
      'Próximamente: branding avanzado',
      'Próximamente: integraciones reales',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Empresa',
    price: 39990,
    maxActiveListings: DOMAIN_PLAN_CAPABILITIES.enterprise.maxActiveListings,
    maxImagesPerListing: DOMAIN_PLAN_CAPABILITIES.enterprise.maxImagesPerListing,
    features: [
      'Próximamente: multiusuario (equipo)',
      'Próximamente: branding avanzado',
      'Próximamente: integraciones reales',
    ],
  },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;

export function normalizeSubscriptionPlanId(input: AnyPlanKey | null | undefined): UnifiedPlanKey {
  return normalizePlanKey(input);
}

export function getMaxActiveListingsByPlan(input: AnyPlanKey | null | undefined): number {
  return getPlanMaxActiveListings(input);
}

export function getPlanCapabilitiesByPlan(
  input: AnyPlanKey | null | undefined
): PlanCapabilities {
  return getPlanCapabilities(input);
}

// Currencies
export const SUPPORTED_CURRENCIES = ['CLP', 'USD', 'EUR', 'UF'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Locales
export const DEFAULT_LOCALE = 'es-CL';
export const SUPPORTED_LOCALES = ['es-CL', 'es-ES', 'en-US'] as const;

// Date formats
export const DATE_FORMAT = 'DD/MM/YYYY';
export const DATETIME_FORMAT = 'DD/MM/YYYY HH:mm';
export const TIME_FORMAT = 'HH:mm';

// API
export const API_VERSION = 'v1';
export const API_TIMEOUT = 30000; // 30 segundos

// =====================
// Media / uploads limits
// =====================

// Overrides por vertical (si no existe override, se usa MAX_IMAGES_PER_LISTING)
const MAX_IMAGES_PER_LISTING_BY_VERTICAL: Partial<Record<VerticalName, number>> = {
  // (sin overrides por ahora)
};

// Overrides más finos por tipo de vehículo dentro de una vertical.
// Ej: { autos: { car: 12, motorcycle: 10 } }
const MAX_IMAGES_PER_LISTING_BY_VERTICAL_AND_VEHICLE_TYPE: Partial<
  Record<VerticalName, Partial<Record<string, number>>>
> = {
  autos: {},
};

export function getMaxImagesPerListing(opts?: {
  vertical?: VerticalName;
  vehicleTypeKey?: string | null;
}): number {
  const vertical = opts?.vertical;
  const vehicleTypeKey = opts?.vehicleTypeKey ? String(opts.vehicleTypeKey) : null;

  if (vertical && vehicleTypeKey) {
    const byType = MAX_IMAGES_PER_LISTING_BY_VERTICAL_AND_VEHICLE_TYPE[vertical];
    const v = byType?.[vehicleTypeKey];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  }

  if (vertical) {
    const v = MAX_IMAGES_PER_LISTING_BY_VERTICAL[vertical];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  }

  return MAX_IMAGES_PER_LISTING;
}
