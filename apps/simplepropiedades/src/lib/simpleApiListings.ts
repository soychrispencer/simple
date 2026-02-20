import type { Property, PropertyType } from "@/types/property";
import { logWarn } from "@/lib/logger";

export type SimpleApiListingType = "sale" | "rent" | "auction";

type SimpleApiListingItem = {
  id: string;
  vertical: string;
  type: SimpleApiListingType;
  title: string;
  price: number;
  currency: string;
  city: string;
};

type SimpleApiListingsResponse = {
  items?: SimpleApiListingItem[];
};

type SimpleApiMediaResponse = {
  items?: Array<{ url?: string; kind?: "image" | "video" }>;
};

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function guessPropertyType(title: string): PropertyType {
  const normalized = title.toLowerCase();
  if (normalized.includes("casa")) return "house";
  if (normalized.includes("terreno")) return "land";
  if (normalized.includes("oficina")) return "office";
  if (normalized.includes("bodega")) return "warehouse";
  if (normalized.includes("local") || normalized.includes("comercial")) return "commercial";
  return "apartment";
}

export function isSimpleApiListingsEnabled(): boolean {
  const raw = String(process.env.NEXT_PUBLIC_ENABLE_SIMPLE_API_LISTINGS || "")
    .toLowerCase()
    .trim();

  if (["true", "1", "yes", "on"].includes(raw)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(raw)) {
    return false;
  }

  return Boolean(getSimpleApiBaseUrl());
}

export function getSimpleApiBaseUrl(): string | null {
  const explicit = String(process.env.NEXT_PUBLIC_SIMPLE_API_BASE_URL || "").trim();
  if (explicit) {
    return normalizeBaseUrl(explicit);
  }

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:4000";
  }

  return null;
}

async function fetchListingMedia(baseUrl: string, listingId: string): Promise<string[]> {
  const res = await fetch(`${baseUrl}/v1/listings/${listingId}/media`, {
    method: "GET",
    cache: "no-store"
  });

  if (!res.ok) {
    return [];
  }

  const payload = (await res.json()) as SimpleApiMediaResponse;
  const media = Array.isArray(payload.items) ? payload.items : [];
  return media
    .filter((item) => item?.kind === "image" && typeof item.url === "string")
    .map((item) => String(item.url));
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

  const query = new URLSearchParams({
    vertical: "properties",
    type: options.listingType,
    limit: String(options.limit),
    offset: "0"
  });

  const res = await fetch(`${baseUrl}/v1/listings?${query.toString()}`, {
    method: "GET",
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Simple API listings failed (${res.status})`);
  }

  const payload = (await res.json()) as SimpleApiListingsResponse;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const propertyItems = items.filter((item) => item.vertical === "properties");

  const mediaMatrix = await Promise.all(
    propertyItems.map(async (item) => {
      try {
        return await fetchListingMedia(baseUrl, item.id);
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
    description: "",
    property_type: guessPropertyType(item.title),
    listing_type: item.type,
    status: "available",
    price: item.price ?? 0,
    currency: item.currency || "CLP",
    rent_price: item.type === "rent" ? item.price : null,
    country: "Chile",
    region: item.city || "",
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
    owner_id: "",
    views_count: 0,
    featured: true,
    created_at: now,
    updated_at: now
  }));
}
