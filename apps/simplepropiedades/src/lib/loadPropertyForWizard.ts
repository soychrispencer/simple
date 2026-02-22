import { getListingMedia, listMyListings } from "@simple/sdk";

export interface RawPropertyListing {
  id: string;
  title: string;
  description?: string | null;
  listing_type: string;
  price?: number | null;
  currency?: string | null;
  metadata?: Record<string, any> | null;
  status?: string | null;
  visibility?: string | null;
  region_id?: string | null;
  commune_id?: string | null;
  listings_properties?: Record<string, any> | null;
  images?: Array<{ id: string; url: string; is_primary?: boolean | null; position?: number | null }> | null;
  regions?: { name?: string | null } | null;
  communes?: { name?: string | null } | null;
}

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem("simple_access_token");
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export async function loadPropertyForWizard(id: string): Promise<RawPropertyListing | null> {
  const accessToken = readAccessToken();
  if (!accessToken) {
    throw new Error("No hay sesión activa");
  }

  const mine = await listMyListings({
    accessToken,
    vertical: "properties",
    limit: 500,
    offset: 0
  });

  const match = (mine.items || []).find((item) => String(item.id) === String(id));
  if (!match) return null;

  const media = await getListingMedia(String(id)).catch(() => ({ items: [] as any[] }));
  const images = (media.items || [])
    .filter((row: any) => row?.kind === "image" && row?.url)
    .map((row: any, index: number) => ({
      id: String(row.id || `${id}-${index}`),
      url: String(row.url),
      is_primary: Number(row.order || 0) === 0,
      position: Number(row.order || index)
    }));

  return {
    id: String(match.id),
    title: match.title,
    description: match.description ?? null,
    listing_type: match.type,
    price: match.price ?? null,
    currency: match.currency ?? "CLP",
    metadata: (match as any).metadata || {},
    status: match.status ?? "draft",
    visibility: (match as any).visibility ?? "normal",
    region_id: match.regionId ?? null,
    commune_id: match.communeId ?? null,
    listings_properties: {
      property_type: match.propertyType ?? null,
      operation_type: match.type,
      bedrooms: match.bedrooms ?? null,
      bathrooms: match.bathrooms ?? null,
      parking_spaces: match.parkingSpaces ?? null,
      total_area: match.areaM2 ?? null,
      built_area: match.areaBuiltM2 ?? null,
      floor: match.floor ?? null,
      building_floors: match.totalFloors ?? null,
      furnished: match.isFurnished ?? null,
      pet_friendly: match.allowsPets ?? null,
      features: match.features ?? [],
      amenities: match.amenities ?? []
    },
    images,
    regions: match.region ? { name: match.region } : null,
    communes: match.city ? { name: match.city } : null
  };
}
