import type { Property } from '@/types/property';
import { getSupabaseClient } from '@/lib/supabase/supabase';

const VERTICAL_KEY = 'properties';

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

function mapListingsToProperties(listings: any[] = []): Property[] {
  return listings.map((listing: any) => {
    const props = Array.isArray(listing.listings_properties)
      ? listing.listings_properties[0]
      : listing.listings_properties;
    const region = Array.isArray(listing.regions)
      ? listing.regions[0]?.name
      : listing.regions?.name || '';
    const commune = Array.isArray(listing.communes)
      ? listing.communes[0]?.name
      : listing.communes?.name || '';

    const sortedImages = (listing.images || [])
      .sort((a: any, b: any) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.position || 0) - (b.position || 0);
      })
      .map((img: any) => img.url);

    return {
      id: listing.id,
      title: listing.title,
      description: listing.description || '',
      property_type: props?.property_type as Property['property_type'],
      listing_type: listing.listing_type as Property['listing_type'],
      status: 'available',
      price: listing.price || 0,
      currency: listing.currency || 'CLP',
      country: 'Chile',
      region,
      city: commune,
      bedrooms: props?.bedrooms || 0,
      bathrooms: props?.bathrooms || 0,
      area_m2: props?.total_area || 0,
      area_built_m2: props?.built_area || null,
      parking_spaces: props?.parking_spaces || 0,
      floor: props?.floor || null,
      total_floors: props?.building_floors || null,
      has_pool: props?.features?.includes('pool') || false,
      has_garden: props?.features?.includes('garden') || false,
      has_elevator: props?.amenities?.includes('elevator') || false,
      has_balcony: props?.features?.includes('balcony') || false,
      has_terrace: props?.features?.includes('terrace') || false,
      has_gym: props?.amenities?.includes('gym') || false,
      has_security: props?.amenities?.includes('security') || false,
      is_furnished: props?.furnished || false,
      allows_pets: props?.pet_friendly || false,
      image_urls: sortedImages,
      owner_id: listing.user_id,
      views_count: 0,
      featured: listing.is_featured || false,
      created_at: listing.created_at,
      updated_at: listing.created_at,
    } as Property;
  });
}

export async function fetchPropertyListings(filters: PropertyListingFilters = {}): Promise<PropertyListingResponse> {
  const supabase = getSupabaseClient();
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const { data: verticalData, error: verticalError } = await supabase
    .from('verticals')
    .select('id')
    .eq('key', VERTICAL_KEY)
    .single();

  if (verticalError || !verticalData) {
    throw new Error('Error fetching properties vertical');
  }

  let queryBuilder = supabase
    .from('listings')
    .select(
      `
        id,
        title,
        description,
        listing_type,
        price,
        currency,
        status,
        published_at,
        is_featured,
        contact_phone,
        contact_email,
        location,
        region_id,
        commune_id,
        created_at,
        user_id,
        listings_properties(
          property_type,
          operation_type,
          bedrooms,
          bathrooms,
          parking_spaces,
          total_area,
          built_area,
          land_area,
          floor,
          building_floors,
          year_built,
          furnished,
          pet_friendly,
          features,
          amenities
        ),
        regions(name),
        communes(name),
        images(url, is_primary, position)
      `,
      { count: 'exact' }
    )
    .eq('vertical_id', verticalData.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const {
    keyword,
    propertyType,
    listingType,
    city,
    regionId,
    communeId,
    currency,
    minPrice,
    maxPrice,
    minBedrooms,
    minBathrooms,
    minArea,
    maxArea,
    hasPool,
    hasGarden,
    hasTerrace,
    hasBalcony,
    hasElevator,
    hasSecurity,
    hasParking,
    isFurnished,
    allowsPets,
  } = filters;

  if (keyword?.trim()) queryBuilder = queryBuilder.ilike('title', `%${keyword.trim()}%`);
  if (propertyType) queryBuilder = queryBuilder.eq('listings_properties.property_type', propertyType);
  if (listingType) queryBuilder = queryBuilder.eq('listing_type', listingType);
  if (city?.trim()) queryBuilder = queryBuilder.ilike('location', `%${city.trim()}%`);
  if (regionId) queryBuilder = queryBuilder.eq('region_id', regionId);
  if (communeId) queryBuilder = queryBuilder.eq('commune_id', communeId);
  if (currency) queryBuilder = queryBuilder.eq('currency', currency);
  if (typeof minPrice === 'number') queryBuilder = queryBuilder.gte('price', minPrice);
  if (typeof maxPrice === 'number') queryBuilder = queryBuilder.lte('price', maxPrice);
  if (typeof minBedrooms === 'number') queryBuilder = queryBuilder.gte('listings_properties.bedrooms', minBedrooms);
  if (typeof minBathrooms === 'number') queryBuilder = queryBuilder.gte('listings_properties.bathrooms', minBathrooms);
  if (typeof minArea === 'number') queryBuilder = queryBuilder.gte('listings_properties.total_area', minArea);
  if (typeof maxArea === 'number') queryBuilder = queryBuilder.lte('listings_properties.total_area', maxArea);

  if (isFurnished) queryBuilder = queryBuilder.eq('listings_properties.furnished', true);
  if (allowsPets) queryBuilder = queryBuilder.eq('listings_properties.pet_friendly', true);
  if (hasParking) queryBuilder = queryBuilder.gte('listings_properties.parking_spaces', 1);
  if (hasPool) queryBuilder = queryBuilder.contains('listings_properties.features', ['pool']);
  if (hasGarden) queryBuilder = queryBuilder.contains('listings_properties.features', ['garden']);
  if (hasTerrace) queryBuilder = queryBuilder.contains('listings_properties.features', ['terrace']);
  if (hasBalcony) queryBuilder = queryBuilder.contains('listings_properties.features', ['balcony']);
  if (hasElevator) queryBuilder = queryBuilder.contains('listings_properties.amenities', ['elevator']);
  if (hasSecurity) queryBuilder = queryBuilder.contains('listings_properties.amenities', ['security']);

  const { data, error, count } = await queryBuilder;

  if (error) {
    throw error;
  }

  return {
    properties: mapListingsToProperties(data || []),
    count: count || 0,
  };
}
