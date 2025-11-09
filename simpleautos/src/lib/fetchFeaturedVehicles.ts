import { getSupabaseClient } from './supabase/supabase';
import { FeaturedVehicleRow, mapVehicleToFeaturedRow, loadProfiles, VehicleJoinedRow } from './vehicleUtils';

/**
 * Obtiene vehículos destacados con información completa.
 * Busca vehículos con featured = true (independiente de visibility)
 * Hace JOIN con vehicle_types, regions y communes para obtener datos reales
 */
export async function fetchFeaturedVehicles(limit = 45): Promise<FeaturedVehicleRow[]> {
  const supabase = getSupabaseClient();
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

  const { data, error } = await supabase
    .from('vehicles')
    .select(select)
    .eq('featured', true)
    .eq('status', 'active') // Solo mostrar vehículos publicados
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!data) return [];

  // Cargar profiles por separado (sin FK entre vehicles.owner_id y profiles.id)
  const ownerIds = [...new Set((data as any[]).map(v => v.owner_id).filter(Boolean))];
  const profilesMap = await loadProfiles(ownerIds);

  return (data as unknown as VehicleJoinedRow[]).map((r) => mapVehicleToFeaturedRow(r, profilesMap));
}
