import { getSupabaseClient } from './supabase/supabase';
import { FeaturedVehicleRow, mapVehicleToFeaturedRow, loadProfiles, VehicleJoinedRow } from './vehicleUtils';
import { logError } from './logger';

/**
 * Obtiene vehículos destacados con información completa.
 * Busca vehículos con featured = true (independiente de visibility)
 * Hace JOIN con vehicle_types, regions y communes para obtener datos reales
 */
export async function fetchFeaturedVehicles(limit = 45): Promise<FeaturedVehicleRow[]> {
  const supabase = getSupabaseClient();

  // Obtener el ID del vertical de vehicles
  const { data: verticalData, error: verticalError } = await supabase
    .from('verticals')
    .select('id')
    .eq('key', 'vehicles')
    .single();

  if (verticalError || !verticalData) {
    logError('Error fetching vehicles vertical', verticalError, { scope: 'fetchFeaturedVehicles' });
    return [];
  }

  const select = [
    'id',
    'title',
    'listing_type',
    'price',
    'user_id',
    'region_id',
    'commune_id',
    'created_at',
    'visibility',
    'contact_email',
    'contact_phone',
    'contact_whatsapp',
    'allow_financing',
    'allow_exchange',
    'is_featured as featured',
    'rent_daily_price',
    'rent_weekly_price',
    'rent_monthly_price',
    'rent_security_deposit',
    'auction_start_price',
    'auction_start_at',
    'auction_end_at',
    'listings_vehicles!inner(year, mileage, brand_id, model_id, transmission, fuel_type, brands!inner(name), models!inner(name, vehicle_types!inner(category)))',
    'regions(name)',
    'communes(name)'
  ].join(',');

  const { data, error } = await supabase
    .from('listings')
    .select(select)
    .eq('status', 'published')
    .eq('is_featured', true)
    .eq('vertical_id', verticalData.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!data) return [];

  // Compat: algunos backends pueden devolver `owner_id` o `user_id`.
  // Aseguramos `owner_id` en cada fila y luego cargamos los profiles.
  const normalized = (data as any[]).map((r) => ({ ...(r || {}), owner_id: (r as any).owner_id || (r as any).user_id }));
  const ownerIds = [...new Set(normalized.map(v => v.owner_id).filter(Boolean))];
  const profilesMap = await loadProfiles(ownerIds);

  return (normalized as unknown as VehicleJoinedRow[]).map((r) => mapVehicleToFeaturedRow(r, profilesMap));
}


