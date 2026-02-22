import { listListings, type SdkListingSummary, type SdkListingType } from '@simple/sdk';
import { FeaturedVehicleRow } from './vehicleUtils';
import { logError } from './logger';

function mapSdkItem(item: SdkListingSummary): FeaturedVehicleRow {
  const rentPeriod = (item.rentPricePeriod ??
    (item.rentDailyPrice != null
      ? 'daily'
      : item.rentWeeklyPrice != null
      ? 'weekly'
      : item.rentMonthlyPrice != null
      ? 'monthly'
      : null)) as FeaturedVehicleRow['rent_price_period'];

  const rentDerivedPrice = rentPeriod === 'daily'
    ? item.rentDailyPrice ?? null
    : rentPeriod === 'weekly'
    ? item.rentWeeklyPrice ?? null
    : rentPeriod === 'monthly'
    ? item.rentMonthlyPrice ?? null
    : null;

  const effectivePrice = rentDerivedPrice ?? (typeof item.price === 'number' ? item.price : null);

  return {
    id: item.id,
    title: item.title,
    listing_type: (item.type || 'sale') as FeaturedVehicleRow['listing_type'],
    price: effectivePrice,
    year: typeof item.year === 'number' ? item.year : null,
    mileage: typeof item.mileage === 'number' ? item.mileage : null,
    image_urls: item.imageUrl ? [item.imageUrl] : [],
    type_id: item.typeId || null,
    type_key: item.typeKey || null,
    type_label: item.typeLabel || null,
    region_name: item.region || null,
    commune_name: item.city || null,
    owner_id: item.ownerId || null,
    created_at: item.createdAt || item.publishedAt || new Date().toISOString(),
    visibility: item.visibility || 'normal',
    allow_financing: Boolean(item.allowFinancing),
    allow_exchange: Boolean(item.allowExchange),
    featured: Boolean(item.featured),
    contact_email: null,
    contact_phone: null,
    contact_whatsapp: null,
    rent_daily_price: item.rentDailyPrice ?? null,
    rent_weekly_price: item.rentWeeklyPrice ?? null,
    rent_monthly_price: item.rentMonthlyPrice ?? null,
    rent_price_period: rentPeriod,
    rent_security_deposit: item.rentSecurityDeposit ?? null,
    auction_start_price: item.auctionStartPrice ?? null,
    auction_start_at: item.auctionStartAt ?? null,
    auction_end_at: item.auctionEndAt ?? null,
    profiles: null,
    extra_specs: {
      condition: item.condition || null,
      body_type: item.bodyType || null,
      fuel_type: item.fuelType || null,
      transmission: item.transmission || null,
      color: item.color || null,
    },
  };
}

export async function fetchFeaturedVehicles(limit = 45): Promise<FeaturedVehicleRow[]> {
  try {
    const payload = await listListings({
      vertical: 'autos',
      limit,
      offset: 0,
    });

    const items = Array.isArray(payload.items) ? payload.items : [];
    const autos = items.filter((item) => item.vertical === 'autos');
    const featured = autos.filter((item) => item.featured);
    const selected = (featured.length > 0 ? featured : autos).slice(0, limit);

    return selected.map(mapSdkItem);
  } catch (error) {
    logError('Error fetching featured vehicles from simple-api', error, { scope: 'fetchFeaturedVehicles' });
    return [];
  }
}

export async function fetchFeaturedVehiclesByType(
  listingType: SdkListingType,
  limit = 12,
): Promise<FeaturedVehicleRow[]> {
  try {
    const payload = await listListings({
      vertical: 'autos',
      type: listingType,
      limit,
      offset: 0,
    });

    const items = Array.isArray(payload.items) ? payload.items : [];
    const autos = items.filter((item) => item.vertical === 'autos');
    const featured = autos.filter((item) => item.featured);
    const selected = (featured.length > 0 ? featured : autos).slice(0, limit);

    return selected.map(mapSdkItem);
  } catch (error) {
    logError('Error fetching featured vehicles by type from simple-api', error, { listingType, scope: 'fetchFeaturedVehiclesByType' });
    return [];
  }
}
