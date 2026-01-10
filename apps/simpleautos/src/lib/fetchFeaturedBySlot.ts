import { fetchAutosBoostedListings } from './boosts';
import { getSupabaseClient } from './supabase/supabase';
import { FeaturedVehicleRow, mapVehicleToFeaturedRow, loadProfiles } from './vehicleUtils';
import { LISTING_CARD_SELECT, listingRowToVehicleRow } from './listings/queryHelpers';
import { logError } from './logger';

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
    const slotToListingType: Record<string, string | null> = {
      venta_tab: 'sale',
      arriendo_tab: 'rent',
      subasta_tab: 'auction',
      home_main: null,
      user_page: null,
    };

    const listingType = slotToListingType[slotKey] ?? null;

    const boosted = await fetchAutosBoostedListings({
      supabase,
      slotKey,
      limit,
      listingSelect: LISTING_CARD_SELECT,
      listingType: listingType ?? undefined,
      userId: slotKey === 'user_page' ? userId : undefined,
    });

    const listings = boosted.map((row) => listingRowToVehicleRow(row.listing));
    if (!listings.length) {
      return [];
    }

    const ownerIds = Array.from(new Set(listings.map((l) => l.owner_id).filter(Boolean))) as string[];
    const profilesMap = await loadProfiles(ownerIds);
    return listings.map((listing) => mapVehicleToFeaturedRow(listing, profilesMap));
  } catch (error) {
    logError(`Error in fetchFeaturedBySlot for ${slotKey}`, error, { slotKey, userId });
    return [];
  }
}


