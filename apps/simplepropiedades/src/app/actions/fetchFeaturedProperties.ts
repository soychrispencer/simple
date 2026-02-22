'use server';

import type { Property } from '@/types/property';
import { logError, logWarn } from '@/lib/logger';
import { getSimpleApiBaseUrl } from '@simple/config';
import { getListingMedia, listListings, type SdkListingSummary, type SdkListingType } from '@simple/sdk';

function normalizePropertyType(value: unknown, title = ''): Property['property_type'] {
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
  if (normalized === 'commercial' || normalized === 'comercial' || normalized === 'local') return 'commercial';
  if (normalized === 'land' || normalized === 'terreno') return 'land';
  if (normalized === 'office' || normalized === 'oficina') return 'office';
  if (normalized === 'warehouse' || normalized === 'bodega') return 'warehouse';

  const lowerTitle = String(title || '').toLowerCase();
  if (lowerTitle.includes('casa')) return 'house';
  if (lowerTitle.includes('terreno')) return 'land';
  if (lowerTitle.includes('oficina')) return 'office';
  if (lowerTitle.includes('bodega')) return 'warehouse';
  if (lowerTitle.includes('local') || lowerTitle.includes('comercial')) return 'commercial';
  return 'apartment';
}

function mapSimpleApiItemToProperty(item: SdkListingSummary, imageUrls: string[]): Property {
  const features = Array.isArray(item.features) ? item.features : [];
  const amenities = Array.isArray(item.amenities) ? item.amenities : [];
  const now = new Date().toISOString();

  return {
    id: item.id,
    title: item.title,
    description: item.description || '',
    property_type: normalizePropertyType(item.propertyType, item.title),
    listing_type: item.type as Property['listing_type'],
    status: 'available',
    price: Number(item.price || 0),
    currency: item.currency || 'CLP',
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
    image_urls: imageUrls,
    owner_id: item.ownerId || '',
    views_count: 0,
    featured: Boolean(item.featured),
    created_at: item.createdAt || item.publishedAt || now,
    updated_at: item.createdAt || item.publishedAt || now
  };
}

/**
 * Server Action: Obtener propiedades destacadas por tipo de listado
 * Consulta la base de datos real con el nuevo esquema multi-vertical
 */
export async function fetchFeaturedProperties(
  listingType?: 'sale' | 'rent' | 'auction',
  limit: number = 12
): Promise<Property[]> {
  try {
    const simpleApiBase = getSimpleApiBaseUrl();
    if (!simpleApiBase) {
      return [];
    }

    const apiType: SdkListingType | undefined =
      listingType === 'sale' || listingType === 'rent' || listingType === 'auction'
        ? listingType
        : undefined;

    const payload = await listListings({
      vertical: 'properties',
      type: apiType,
      limit,
      offset: 0
    });
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (items.length === 0) return [];

    const mediaMatrix = await Promise.all(
      items.map(async (item) => {
        try {
          const mediaPayload = await getListingMedia(item.id);
          const mediaImageUrls = Array.isArray(mediaPayload.items)
            ? mediaPayload.items
                .filter((entry: any) => entry?.kind === 'image' && typeof entry?.url === 'string')
                .sort((a: any, b: any) => Number(a?.order ?? 0) - Number(b?.order ?? 0))
                .map((entry: any) => String(entry.url))
            : [];
          if (mediaImageUrls.length > 0) return mediaImageUrls;
        } catch {
          // fallback silencioso al imageUrl resumido
        }
        return item.imageUrl ? [item.imageUrl] : [];
      })
    );

    return items.map((item, idx) => mapSimpleApiItemToProperty(item, mediaMatrix[idx] || []));

  } catch (error) {
    logWarn('Simple API featured properties failed', { error, listingType, limit });
    logError('Unexpected error in fetchFeaturedProperties:', error);
    return [];
  }
}
