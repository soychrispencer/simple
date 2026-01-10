'use server';

import type { Property } from '@/types/property';
import { getSupabaseClient } from '@/lib/supabase/supabase';
import { logError } from '@/lib/logger';

const VERTICAL_KEY = 'properties';

/**
 * Server Action: Obtener propiedades destacadas por tipo de listado
 * Consulta la base de datos real con el nuevo esquema multi-vertical
 */
export async function fetchFeaturedProperties(
  listingType?: 'sale' | 'rent' | 'auction',
  limit: number = 12
): Promise<Property[]> {
  const supabase = getSupabaseClient();

  try {
    // First get the properties vertical ID
    const { data: verticalData, error: verticalError } = await supabase
      .from('verticals')
      .select('id')
      .eq('key', VERTICAL_KEY)
      .single();

    if (verticalError || !verticalData) {
      logError('Error getting vertical:', verticalError);
      return [];
    }

    // Build the query
    let query = supabase
      .from('listings')
      .select(`
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
        listings_properties!inner(
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
        regions!inner(name),
        communes!inner(name),
        images!inner(url, is_primary, position)
      `)
      .eq('vertical_id', verticalData.id)
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(limit);

    // Filter by listing type if specified
    if (listingType) {
      query = query.eq('listing_type', listingType);
    }

    const { data: listings, error } = await query;

    if (error) {
      logError('Error fetching featured properties:', error);
      return [];
    }

    if (!listings || listings.length === 0) {
      return [];
    }

    // Map to Property interface
    const properties: Property[] = listings.map((listing: any) => {
      const props = listing.listings_properties;
      const region = listing.regions?.[0]?.name || '';
      const commune = listing.communes?.[0]?.name || '';

      // Sort images by position and primary
      const sortedImages = listing.images
        ?.sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return a.position - b.position;
        })
        .map((img: any) => img.url) || [];

      return {
        id: listing.id,
        title: listing.title,
        description: listing.description || '',
        property_type: props.property_type as Property['property_type'],
        listing_type: listing.listing_type as Property['listing_type'],
        status: 'available' as Property['status'], // Map status appropriately
        price: listing.price || 0,
        currency: listing.currency || 'CLP',
        country: 'Chile',
        region: region,
        city: commune,
        bedrooms: props.bedrooms || 0,
        bathrooms: props.bathrooms || 0,
        area_m2: props.total_area || 0,
        area_built_m2: props.built_area || null,
        parking_spaces: props.parking_spaces || 0,
        floor: props.floor || null,
        total_floors: props.building_floors || null,
        has_pool: props.features?.includes('pool') || false,
        has_garden: props.features?.includes('garden') || false,
        has_elevator: props.amenities?.includes('elevator') || false,
        has_balcony: props.features?.includes('balcony') || false,
        has_terrace: props.features?.includes('terrace') || false,
        has_gym: props.amenities?.includes('gym') || false,
        has_security: props.amenities?.includes('security') || false,
        is_furnished: props.furnished || false,
        allows_pets: props.pet_friendly || false,
        image_urls: sortedImages,
        owner_id: listing.user_id,
        views_count: 0, // Not implemented yet
        featured: listing.is_featured || false,
        created_at: listing.created_at,
        updated_at: listing.created_at
      };
    });

    return properties;

  } catch (error) {
    logError('Unexpected error in fetchFeaturedProperties:', error);
    return [];
  }
}
