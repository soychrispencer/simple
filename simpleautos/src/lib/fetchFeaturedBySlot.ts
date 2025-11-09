import { getSupabaseClient } from './supabase/supabase';
import { FeaturedVehicleRow, mapVehicleToFeaturedRow, loadProfiles, VehicleJoinedRow } from './vehicleUtils';

export type BoostSlotKey = 'home_main' | 'venta_tab' | 'arriendo_tab' | 'subasta_tab' | 'user_page';

/**
 * Obtiene vehículos destacados de un slot específico del sistema de boosts
 * @param slotKey - Clave del slot (home_main, venta_tab, etc.)
 * @param limit - Número máximo de vehículos a retornar
 * @param userId - (Opcional) Para slot user_page, ID del usuario
 */
export async function fetchFeaturedBySlot(
  slotKey: BoostSlotKey,
  limit = 10,
  userId?: string
): Promise<FeaturedVehicleRow[]> {
  const supabase = getSupabaseClient();

  try {
    // Mapear slot a listing_type
    const slotToListingType: Record<string, string | null> = {
      'venta_tab': 'sale',
      'arriendo_tab': 'rent',
      'subasta_tab': 'auction',
      'home_main': null, // Permite todos los tipos
      'user_page': null  // Permite todos los tipos
    };

    const expectedListingType = slotToListingType[slotKey];

    // Primero obtener el ID del slot
    const { data: slotInfo, error: slotInfoError } = await supabase
      .from('boost_slots')
      .select('id')
      .eq('key', slotKey)
      .single();

    if (slotInfoError || !slotInfo) {
      console.error(`Error getting slot info for ${slotKey}:`, slotInfoError);
      return [];
    }

    // Luego obtener vehículos de ese slot
    const { data: slotData, error: slotError } = await supabase
      .from('vehicle_boost_slots')
      .select('vehicle_id, priority, end_date')
      .eq('slot_id', slotInfo.id)
      .eq('is_active', true)
      .gt('end_date', new Date().toISOString())
      .order('priority', { ascending: false })
      .limit(limit);

    if (slotError) {
      console.error(`Error querying vehicle_boost_slots for ${slotKey}:`, slotError);
      return [];
    }

    if (!slotData || slotData.length === 0) {
      console.log(`No vehicles found in slot ${slotKey}`);
      return [];
    }

    const vehicleIds = slotData.map((item: any) => item.vehicle_id).filter(Boolean);
  
  const select = [
    'id',
    'title',
    'listing_type',
    'price',
    'year',
    'mileage',
    'image_urls',
    'type_id',
    'owner_id',
    'region_id',
    'commune_id',
    'created_at',
    'visibility',
    'allow_financing',
    'allow_exchange',
    'featured',
    'rent_daily_price',
    'rent_weekly_price',
    'rent_monthly_price',
    'rent_security_deposit',
    'auction_start_price',
    'auction_start_at',
    'auction_end_at',
    'extra_specs',
    'vehicle_types!inner(slug, label)',
    'regions(name)',
    'communes(name)'
  ].join(',');
  // Construir query con filtro opcional por listing_type
  let vehicleQuery = supabase
    .from('vehicles')
    .select(select)
    .in('id', vehicleIds)
    .eq('status', 'active');

  // Agregar filtro por listing_type si el slot lo requiere
  if (expectedListingType) {
    vehicleQuery = vehicleQuery.eq('listing_type', expectedListingType);
  }

  const { data: vehicles, error: vehiclesError } = await vehicleQuery;

  if (vehiclesError || !vehicles) {
    console.error('Error fetching vehicle details:', vehiclesError);
    return [];
  }

  // Cargar profiles
  const ownerIds = [...new Set((vehicles as unknown as VehicleJoinedRow[]).map((v) => v.owner_id).filter(Boolean))] as string[];
  const profilesMap = await loadProfiles(ownerIds);

  // Mapear resultados al formato FeaturedVehicleRow
  return (vehicles as unknown as VehicleJoinedRow[]).map((r) => mapVehicleToFeaturedRow(r, profilesMap));
  
  } catch (error) {
    console.error(`Error in fetchFeaturedBySlot for ${slotKey}:`, error);
    return [];
  }
}
