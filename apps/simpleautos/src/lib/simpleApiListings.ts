import { logWarn } from "@/lib/logger";

export type SimpleApiListingType = "sale" | "rent" | "auction";

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

  const query = new URLSearchParams({
    vertical: "autos",
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
  const autosItems = items.filter((item) => item.vertical === "autos");

  const mediaMatrix = await Promise.all(
    autosItems.map(async (item) => {
      try {
        return await fetchListingMedia(baseUrl, item.id);
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
    year: null,
    mileage: null,
    image_urls: mediaMatrix[idx] ?? [],
    type_key: "car",
    type_label: "Auto",
    region_name: null,
    commune_name: item.city || null,
    owner_id: "",
    featured: true,
    visibility: "featured",
    rent_daily_price: item.type === "rent" ? item.price : null,
    rent_weekly_price: null,
    rent_monthly_price: null,
    rent_price_period: item.type === "rent" ? "daily" : null,
    auction_start_price: item.type === "auction" ? item.price : null,
    extra_specs: {
      condition: "used",
      legacy: {
        commune_name: item.city || null
      }
    }
  }));
}
