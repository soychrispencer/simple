import type { Property, PropertyType } from "@/types/property";
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
};

type SimpleApiListingsResponse = {
  items?: SimpleApiListingItem[];
};

function guessPropertyType(title: string): PropertyType {
  const normalized = title.toLowerCase();
  if (normalized.includes("casa")) return "house";
  if (normalized.includes("terreno")) return "land";
  if (normalized.includes("oficina")) return "office";
  if (normalized.includes("bodega")) return "warehouse";
  if (normalized.includes("local") || normalized.includes("comercial")) return "commercial";
  return "apartment";
}

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

export async function fetchFeaturedPropertiesFromSimpleApi(options: {
  listingType: "sale" | "rent";
  limit: number;
}): Promise<Property[]> {
  const baseUrl = getSimpleApiBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "Simple API base URL no configurada. Define NEXT_PUBLIC_SIMPLE_API_BASE_URL."
    );
  }

  const payload = (await listListings({
    vertical: "properties",
    type: options.listingType,
    limit: options.limit,
    offset: 0
  })) as SimpleApiListingsResponse;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const propertyItems = items.filter((item) => item.vertical === "properties");

  const mediaMatrix = await Promise.all(
    propertyItems.map(async (item) => {
      if (item.imageUrl) {
        return [String(item.imageUrl)];
      }
      try {
        return await fetchListingMedia(item.id);
      } catch {
        logWarn("Simple API media fetch failed for property listing", { listingId: item.id });
        return [];
      }
    })
  );

  const now = new Date().toISOString();

  return propertyItems.map((item, idx) => ({
    id: item.id,
    title: item.title,
    description: item.description || "",
    property_type: guessPropertyType(item.title),
    listing_type: item.type,
    status: "available",
    price: item.price ?? 0,
    currency: item.currency || "CLP",
    rent_price: item.type === "rent" ? item.price : null,
    country: "Chile",
    region: item.region || "",
    city: item.city || "",
    bedrooms: 0,
    bathrooms: 0,
    area_m2: 0,
    area_built_m2: null,
    parking_spaces: 0,
    floor: null,
    total_floors: null,
    has_pool: false,
    has_garden: false,
    has_elevator: false,
    has_balcony: false,
    has_terrace: false,
    has_gym: false,
    has_security: false,
    is_furnished: false,
    allows_pets: false,
    image_urls: mediaMatrix[idx] ?? [],
    owner_id: item.ownerId || "",
    views_count: 0,
    featured: true,
    created_at: item.createdAt || item.publishedAt || now,
    updated_at: item.createdAt || item.publishedAt || now
  }));
}
