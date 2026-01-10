import type { RentPricePeriod } from '@/types/vehicle';
import type { VehicleJoinedRow } from '../vehicleUtils';

export const LISTING_CARD_SELECT = `
  id,
  title,
  listing_type,
  status,
  price,
  currency,
  user_id,
  public_profile_id,
  region_id,
  commune_id,
  visibility,
  contact_email,
  contact_phone,
  contact_whatsapp,
  allow_financing,
  allow_exchange,
  created_at,
  metadata,
  rent_daily_price,
  rent_weekly_price,
  rent_monthly_price,
  rent_security_deposit,
  auction_start_price,
  auction_start_at,
  auction_end_at,
  listings_vehicles(
    vehicle_type_id,
    year,
    mileage,
    transmission,
    fuel_type,
    condition,
    brand_id,
    model_id,
    brands(name),
    models(name, vehicle_types(category))
  ),
  regions(name),
  communes(name),
  images:images(url, position, is_primary)
`;

export type ListingCardRow = Record<string, any>;

function sortImages(images: Array<Record<string, any>> | null | undefined) {
  if (!Array.isArray(images)) return [] as Array<Record<string, any>>;
  return [...images].sort((a, b) => {
    const aPrimary = a?.is_primary ? 0 : 1;
    const bPrimary = b?.is_primary ? 0 : 1;
    if (aPrimary === bPrimary) {
      return (a?.position ?? 0) - (b?.position ?? 0);
    }
    return aPrimary - bPrimary;
  });
}

export function deriveRentPricePeriod(listing: ListingCardRow): RentPricePeriod | null {
  const metadata = (listing?.metadata ?? {}) as Record<string, any>;
  const rentDaily = listing.rent_daily_price ?? metadata?.rent_daily_price ?? null;
  const rentWeekly = listing.rent_weekly_price ?? metadata?.rent_weekly_price ?? null;
  const rentMonthly = listing.rent_monthly_price ?? metadata?.rent_monthly_price ?? null;

  if (metadata?.rent_price_period) {
    return metadata.rent_price_period as RentPricePeriod;
  }
  if (rentDaily != null) return 'daily';
  if (rentWeekly != null) return 'weekly';
  if (rentMonthly != null) return 'monthly';
  return null;
}

export function listingRowToVehicleRow(listing: ListingCardRow): VehicleJoinedRow {
  const metadata = (listing.metadata ?? {}) as Record<string, any>;
  const gallery = Array.isArray(metadata.gallery) ? metadata.gallery : [];
  const rentPricePeriod = deriveRentPricePeriod(listing);
  const orderedImages = sortImages(listing.images);
  const relationImages = orderedImages.map((img) => img?.url).filter(Boolean) as string[];
  const imagePaths = gallery.length ? gallery : relationImages;
  const location = (metadata.location ?? {}) as Record<string, any>;

  return {
    id: listing.id,
    title: listing.title,
    listing_type: listing.listing_type,
    price: listing.price,
    year: listing.listings_vehicles?.year ?? null,
    mileage: listing.listings_vehicles?.mileage ?? null,
    image_paths: imagePaths,
    type_id: listing.listings_vehicles?.vehicle_type_id ?? null,
    brand_id: listing.listings_vehicles?.brand_id ?? null,
    model_id: listing.listings_vehicles?.model_id ?? null,
    region_id: listing.region_id ?? null,
    commune_id: listing.commune_id ?? null,
    region_name: listing.regions?.name ?? location.region_name ?? null,
    commune_name: listing.communes?.name ?? location.commune_name ?? null,
    owner_id: listing.user_id ?? null,
    created_at: listing.created_at,
    visibility: listing.visibility ?? 'normal',
    allow_financing: !!listing.allow_financing,
    allow_exchange: !!listing.allow_exchange,
    contact_email: listing.contact_email ?? null,
    contact_phone: listing.contact_phone ?? null,
    contact_whatsapp: listing.contact_whatsapp ?? null,
    featured: listing.visibility === 'featured',
    rent_daily_price: listing.rent_daily_price ?? metadata?.rent_daily_price ?? null,
    rent_weekly_price: listing.rent_weekly_price ?? metadata?.rent_weekly_price ?? null,
    rent_monthly_price: listing.rent_monthly_price ?? metadata?.rent_monthly_price ?? null,
    rent_price_period: rentPricePeriod,
    rent_security_deposit: listing.rent_security_deposit ?? metadata?.rent_security_deposit ?? null,
    auction_start_price: listing.auction_start_price ?? metadata?.auction_start_price ?? null,
    auction_start_at: listing.auction_start_at ?? metadata?.auction_start_at ?? null,
    auction_end_at: listing.auction_end_at ?? metadata?.auction_end_at ?? null,
    specs: metadata,
    extra_specs: metadata,
    listings_vehicles: listing.listings_vehicles ?? null,
    regions: listing.regions ?? null,
    communes: listing.communes ?? null,
  } as VehicleJoinedRow;
}
