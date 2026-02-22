import type { Property } from '@/types/property';
import { isSimpleApiListingsEnabled } from '@simple/config';
import { listListings, type SdkListingSummary, type SdkListingType } from '@simple/sdk';
import { logWarn } from '@/lib/logger';

export interface PropertyListingFilters {
  keyword?: string;
  propertyType?: string;
  listingType?: string;
  city?: string;
  regionId?: string;
  communeId?: string;
  currency?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  minBedrooms?: number | null;
  minBathrooms?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  hasPool?: boolean;
  hasGarden?: boolean;
  hasTerrace?: boolean;
  hasBalcony?: boolean;
  hasElevator?: boolean;
  hasSecurity?: boolean;
  hasParking?: boolean;
  isFurnished?: boolean;
  allowsPets?: boolean;
  limit?: number;
  offset?: number;
}

export interface PropertyListingResponse {
  properties: Property[];
  count: number;
}

function guessPropertyTypeFromTitle(title: string): Property['property_type'] {
  const normalized = String(title || '').toLowerCase();
  if (normalized.includes('casa')) return 'house';
  if (normalized.includes('terreno')) return 'land';
  if (normalized.includes('oficina')) return 'office';
  if (normalized.includes('bodega')) return 'warehouse';
  if (normalized.includes('local') || normalized.includes('comercial')) return 'commercial';
  return 'apartment';
}

function normalizePropertyType(value: unknown, title?: string): Property['property_type'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'house' || normalized === 'casa') return 'house';
  if (
    normalized === 'apartment' ||
    normalized === 'departamento' ||
    normalized === 'depto' ||
    normalized === 'apartamento'
  ) {
    return 'apartment';
  }
  if (normalized === 'commercial' || normalized === 'comercial' || normalized === 'local') {
    return 'commercial';
  }
  if (normalized === 'land' || normalized === 'terreno') return 'land';
  if (normalized === 'office' || normalized === 'oficina') return 'office';
  if (normalized === 'warehouse' || normalized === 'bodega') return 'warehouse';
  return guessPropertyTypeFromTitle(title || '');
}

function mapSimpleApiListingToProperty(item: SdkListingSummary): Property {
  const now = new Date().toISOString();
  const features = Array.isArray(item.features) ? item.features : [];
  const amenities = Array.isArray(item.amenities) ? item.amenities : [];

  return {
    id: item.id,
    title: item.title,
    description: item.description || '',
    property_type: normalizePropertyType(item.propertyType, item.title),
    listing_type: item.type,
    status: 'available',
    price: Number(item.price || 0),
    currency: item.currency || 'CLP',
    rent_price: item.type === 'rent' ? Number(item.price || 0) : null,
    country: 'Chile',
    region: item.region || '',
    city: item.city || '',
    bedrooms: Number(item.bedrooms || 0),
    bathrooms: Number(item.bathrooms || 0),
    area_m2: Number(item.areaM2 || 0),
    area_built_m2: Number(item.areaBuiltM2 || 0) || null,
    parking_spaces: Number(item.parkingSpaces || 0),
    floor: Number.isFinite(Number(item.floor)) ? Number(item.floor) : null,
    total_floors: Number.isFinite(Number(item.totalFloors)) ? Number(item.totalFloors) : null,
    has_pool: features.includes('pool'),
    has_garden: features.includes('garden'),
    has_elevator: amenities.includes('elevator'),
    has_balcony: features.includes('balcony'),
    has_terrace: features.includes('terrace'),
    has_gym: amenities.includes('gym'),
    has_security: amenities.includes('security'),
    is_furnished: Boolean(item.isFurnished),
    allows_pets: Boolean(item.allowsPets),
    image_urls: item.imageUrl ? [item.imageUrl] : [],
    owner_id: item.ownerId || '',
    views_count: 0,
    featured: false,
    created_at: item.createdAt || item.publishedAt || now,
    updated_at: item.createdAt || item.publishedAt || now
  } as Property;
}

async function fetchPropertyListingsFromSimpleApi(
  filters: PropertyListingFilters = {}
): Promise<PropertyListingResponse> {
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const listingType =
    filters.listingType === 'sale' || filters.listingType === 'rent'
      ? (filters.listingType as SdkListingType)
      : undefined;

  const payload = await listListings({
    vertical: 'properties',
    type: listingType,
    keyword: filters.keyword,
    city: filters.city,
    regionId: filters.regionId,
    communeId: filters.communeId,
    currency: filters.currency,
    minPrice: typeof filters.minPrice === 'number' ? filters.minPrice : undefined,
    maxPrice: typeof filters.maxPrice === 'number' ? filters.maxPrice : undefined,
    propertyType: filters.propertyType,
    minBedrooms: typeof filters.minBedrooms === 'number' ? filters.minBedrooms : undefined,
    minBathrooms: typeof filters.minBathrooms === 'number' ? filters.minBathrooms : undefined,
    minArea: typeof filters.minArea === 'number' ? filters.minArea : undefined,
    maxArea: typeof filters.maxArea === 'number' ? filters.maxArea : undefined,
    hasPool: filters.hasPool,
    hasGarden: filters.hasGarden,
    hasTerrace: filters.hasTerrace,
    hasBalcony: filters.hasBalcony,
    hasElevator: filters.hasElevator,
    hasSecurity: filters.hasSecurity,
    hasParking: filters.hasParking,
    isFurnished: filters.isFurnished,
    allowsPets: filters.allowsPets,
    limit,
    offset
  });

  const items = Array.isArray(payload.items) ? payload.items : [];
  return {
    properties: items.map(mapSimpleApiListingToProperty),
    count: Number(payload.meta?.total ?? items.length)
  };
}

export async function fetchPropertyListings(filters: PropertyListingFilters = {}): Promise<PropertyListingResponse> {
  if (!isSimpleApiListingsEnabled()) {
    logWarn('Simple API listings disabled for properties; returning empty state');
    return { properties: [], count: 0 };
  }

  try {
    return await fetchPropertyListingsFromSimpleApi(filters);
  } catch (error) {
    logWarn('Simple API property listing fetch failed; returning empty state', error);
    return { properties: [], count: 0 };
  }
}
