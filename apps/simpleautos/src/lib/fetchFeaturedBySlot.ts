import { type SdkListingType } from '@simple/sdk';
import { FeaturedVehicleRow } from './vehicleUtils';
import { fetchFeaturedVehicles, fetchFeaturedVehiclesByType } from './fetchFeaturedVehicles';
import { logError } from './logger';

export type BoostSlotKey = 'home_main' | 'venta_tab' | 'arriendo_tab' | 'subasta_tab' | 'user_page';

function mapProfileVehicleItem(row: any): FeaturedVehicleRow {
  const images = Array.isArray(row?.images)
    ? [...row.images]
        .sort((a, b) => {
          if (!!a?.is_primary === !!b?.is_primary) {
            return Number(a?.position ?? 0) - Number(b?.position ?? 0);
          }
          return a?.is_primary ? -1 : 1;
        })
        .map((i) => String(i?.url || ''))
        .filter(Boolean)
    : [];

  const listingVehicle = row?.listings_vehicles || {};
  const typeCategory = listingVehicle?.models?.vehicle_types?.category || null;
  const rentPeriod = row?.rent_daily_price != null
    ? 'daily'
    : row?.rent_weekly_price != null
    ? 'weekly'
    : row?.rent_monthly_price != null
    ? 'monthly'
    : null;

  const effectivePrice = rentPeriod === 'daily'
    ? row?.rent_daily_price ?? null
    : rentPeriod === 'weekly'
    ? row?.rent_weekly_price ?? null
    : rentPeriod === 'monthly'
    ? row?.rent_monthly_price ?? null
    : row?.price ?? null;

  return {
    id: String(row?.id || ''),
    title: String(row?.title || 'Sin titulo'),
    listing_type: (row?.listing_type || 'sale') as FeaturedVehicleRow['listing_type'],
    price: typeof effectivePrice === 'number' ? effectivePrice : null,
    year: listingVehicle?.year != null ? Number(listingVehicle.year) : null,
    mileage: listingVehicle?.mileage != null ? Number(listingVehicle.mileage) : null,
    image_urls: images,
    type_id: listingVehicle?.vehicle_type_id || null,
    type_key: typeCategory,
    type_label: typeCategory,
    region_name: row?.regions?.name || null,
    commune_name: row?.communes?.name || null,
    owner_id: row?.owner_id || row?.user_id || null,
    created_at: row?.created_at || new Date().toISOString(),
    visibility: row?.visibility || 'normal',
    allow_financing: Boolean(row?.allow_financing),
    allow_exchange: Boolean(row?.allow_exchange),
    featured: Boolean(row?.featured || row?.is_featured),
    contact_email: row?.contact_email || null,
    contact_phone: row?.contact_phone || null,
    contact_whatsapp: row?.contact_whatsapp || null,
    rent_daily_price: row?.rent_daily_price ?? null,
    rent_weekly_price: row?.rent_weekly_price ?? null,
    rent_monthly_price: row?.rent_monthly_price ?? null,
    rent_price_period: rentPeriod,
    rent_security_deposit: row?.rent_security_deposit ?? null,
    auction_start_price: row?.auction_start_price ?? null,
    auction_start_at: row?.auction_start_at ?? null,
    auction_end_at: row?.auction_end_at ?? null,
    profiles: null,
    extra_specs: row?.metadata?.specs || null,
  };
}

export async function fetchFeaturedBySlot(
  slotKey: BoostSlotKey,
  limit = 10,
  userId?: string
): Promise<FeaturedVehicleRow[]> {
  try {
    if (slotKey === 'user_page') {
      if (!userId) return [];

      const params = new URLSearchParams({
        user_id: userId,
        page: '1',
        page_size: String(limit),
      });
      const response = await fetch(`/api/profile-vehicles?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) return [];

      const items = Array.isArray((payload as { items?: unknown[] }).items)
        ? ((payload as { items: any[] }).items ?? [])
        : [];

      return items.slice(0, limit).map(mapProfileVehicleItem);
    }

    const slotToListingType: Record<Exclude<BoostSlotKey, 'user_page'>, SdkListingType | null> = {
      home_main: null,
      venta_tab: 'sale',
      arriendo_tab: 'rent',
      subasta_tab: 'auction',
    };

    const listingType = slotToListingType[slotKey as Exclude<BoostSlotKey, 'user_page'>] ?? null;

    return listingType
      ? await fetchFeaturedVehiclesByType(listingType, limit)
      : await fetchFeaturedVehicles(limit);
  } catch (error) {
    logError(`Error in fetchFeaturedBySlot for ${slotKey}`, error, { slotKey, userId });
    return [];
  }
}
