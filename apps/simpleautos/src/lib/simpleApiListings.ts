import { logWarn } from "@/lib/logger";
import {
  getSimpleApiBaseUrl,
  isSimpleApiListingsEnabled,
  isSimpleApiStrictWriteEnabled,
  isSimpleApiWriteEnabled
} from "@simple/config";
import { getListingMedia, listListings, type SdkListingType } from "@simple/sdk";

export {
  getSimpleApiBaseUrl,
  isSimpleApiListingsEnabled,
  isSimpleApiStrictWriteEnabled,
  isSimpleApiWriteEnabled
};
export type SimpleApiListingType = SdkListingType;

export interface SimpleApiFeaturedVehicle {
  id: string;
  title: string;
  listing_type: SimpleApiListingType;
  price: number | null;
  year: number | null;
  mileage: number | null;
  image_urls: string[];
  type_key: string | null;
  type_label: string | null;
  region_name: string | null;
  commune_name: string | null;
  owner_id: string;
  featured: boolean;
  visibility: string;
  rent_daily_price: number | null;
  rent_weekly_price: number | null;
  rent_monthly_price: number | null;
  rent_price_period: "daily" | "weekly" | "monthly" | null;
  auction_start_price: number | null;
  extra_specs: Record<string, unknown>;
}

type SimpleApiListingItem = {
  id: string;
  vertical: string;
  type: SimpleApiListingType;
  title: string;
  description?: string;
  price: number;
  currency: string;
  city: string;
  region?: string;
  imageUrl?: string;
  ownerId?: string;
  createdAt?: string;
  publishedAt?: string;
  typeKey?: string;
  typeLabel?: string;
  year?: number;
  mileage?: number;
  bodyType?: string;
  condition?: string;
  fuelType?: string;
  transmission?: string;
  color?: string;
  visibility?: string;
  featured?: boolean;
  rentDailyPrice?: number;
  rentWeeklyPrice?: number;
  rentMonthlyPrice?: number;
  rentPricePeriod?: "daily" | "weekly" | "monthly";
  auctionStartPrice?: number;
};

type SimpleApiListingsResponse = {
  items?: SimpleApiListingItem[];
};

async function fetchListingMedia(listingId: string): Promise<string[]> {
  try {
    const payload = await getListingMedia(listingId);
    const media = Array.isArray(payload.items) ? payload.items : [];
    return media
      .filter((item: { kind?: string; url?: unknown }) => item?.kind === "image" && typeof item.url === "string")
      .map((item: { url?: unknown }) => String(item.url));
  } catch {
    return [];
  }
}

export async function fetchFeaturedAutosFromSimpleApi(options: {
  listingType: SimpleApiListingType;
  limit: number;
}): Promise<SimpleApiFeaturedVehicle[]> {
  const baseUrl = getSimpleApiBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "Simple API base URL no configurada. Define NEXT_PUBLIC_SIMPLE_API_BASE_URL."
    );
  }

  const payload = (await listListings({
    vertical: "autos",
    type: options.listingType,
    limit: options.limit,
    offset: 0
  })) as SimpleApiListingsResponse;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const autosItems = items.filter((item) => item.vertical === "autos");

  const mediaMatrix = await Promise.all(
    autosItems.map(async (item) => {
      if (item.imageUrl) {
        return [String(item.imageUrl)];
      }
      try {
        return await fetchListingMedia(item.id);
      } catch {
        logWarn("Simple API media fetch failed for listing", { listingId: item.id });
        return [];
      }
    })
  );

  return autosItems.map((item, idx) => ({
    id: item.id,
    title: item.title,
    listing_type: item.type,
    price: typeof item.price === "number" ? item.price : null,
    year: typeof item.year === "number" ? item.year : null,
    mileage: typeof item.mileage === "number" ? item.mileage : null,
    image_urls: mediaMatrix[idx] ?? [],
    type_key: item.typeKey || "car",
    type_label: item.typeLabel || "Auto",
    region_name: item.region || null,
    commune_name: item.city || null,
    owner_id: item.ownerId || "",
    featured: Boolean(item.featured),
    visibility: item.visibility || "featured",
    rent_daily_price:
      item.type === "rent" ? item.rentDailyPrice ?? item.price ?? null : null,
    rent_weekly_price: item.type === "rent" ? item.rentWeeklyPrice ?? null : null,
    rent_monthly_price: item.type === "rent" ? item.rentMonthlyPrice ?? null : null,
    rent_price_period: item.type === "rent" ? item.rentPricePeriod ?? "daily" : null,
    auction_start_price:
      item.type === "auction" ? item.auctionStartPrice ?? item.price ?? null : null,
    extra_specs: {
      condition: item.condition || "used",
      body_type: item.bodyType || null,
      fuel_type: item.fuelType || null,
      transmission: item.transmission || null,
      color: item.color || null,
      legacy: {
        region_name: item.region || null,
        commune_name: item.city || null
      }
    }
  }));
}
