import { requestSimpleApiJson } from "@simple/config";
import type {
  SdkDeleteListingResponse,
  SdkListingMediaResponse,
  SdkListingSummary,
  SdkListingsResponse,
  SdkListingType,
  SdkUpsertListingInput,
  SdkUpsertListingResponse
} from "./types";

export async function listListings(params: {
  vertical?: "autos" | "properties" | "stores" | "food";
  type?: SdkListingType;
  typeId?: string;
  typeKey?: string;
  brandId?: string;
  modelId?: string;
  bodyType?: string;
  visibility?: string;
  transmission?: string;
  fuelType?: string;
  color?: string;
  estado?: string;
  yearMin?: number;
  yearMax?: number;
  financingAvailable?: boolean;
  keyword?: string;
  city?: string;
  regionId?: string;
  communeId?: string;
  currency?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  minBedrooms?: number;
  minBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  hasPool?: boolean;
  hasGarden?: boolean;
  hasTerrace?: boolean;
  hasBalcony?: boolean;
  hasElevator?: boolean;
  hasSecurity?: boolean;
  hasParking?: boolean;
  isFurnished?: boolean;
  allowsPets?: boolean;
  limit?: number;
  offset?: number;
}): Promise<SdkListingsResponse> {
  return requestSimpleApiJson<SdkListingsResponse>("/v1/listings", {
    query: {
      vertical: params.vertical,
      type: params.type,
      typeId: params.typeId,
      typeKey: params.typeKey,
      brandId: params.brandId,
      modelId: params.modelId,
      bodyType: params.bodyType,
      visibility: params.visibility,
      transmission: params.transmission,
      fuelType: params.fuelType,
      color: params.color,
      estado: params.estado,
      yearMin: params.yearMin,
      yearMax: params.yearMax,
      financingAvailable: params.financingAvailable,
      keyword: params.keyword,
      city: params.city,
      regionId: params.regionId,
      communeId: params.communeId,
      currency: params.currency,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      propertyType: params.propertyType,
      minBedrooms: params.minBedrooms,
      minBathrooms: params.minBathrooms,
      minArea: params.minArea,
      maxArea: params.maxArea,
      hasPool: params.hasPool,
      hasGarden: params.hasGarden,
      hasTerrace: params.hasTerrace,
      hasBalcony: params.hasBalcony,
      hasElevator: params.hasElevator,
      hasSecurity: params.hasSecurity,
      hasParking: params.hasParking,
      isFurnished: params.isFurnished,
      allowsPets: params.allowsPets,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0
    },
    timeoutMs: 10_000,
    retries: 1
  });
}

export async function listMyListings(params: {
  accessToken: string;
  vertical?: "autos" | "properties" | "stores" | "food";
  type?: SdkListingType;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<SdkListingsResponse> {
  return requestSimpleApiJson<SdkListingsResponse>("/v1/listings/mine", {
    query: {
      vertical: params.vertical,
      type: params.type,
      status: params.status,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0
    },
    headers: {
      Authorization: `Bearer ${params.accessToken}`
    },
    timeoutMs: 10_000,
    retries: 0
  });
}

export async function getListingMedia(listingId: string): Promise<SdkListingMediaResponse> {
  return requestSimpleApiJson<SdkListingMediaResponse>(`/v1/listings/${listingId}/media`, {
    timeoutMs: 8_000,
    retries: 0
  });
}

export async function getListingById(listingId: string): Promise<{ item: SdkListingSummary }> {
  return requestSimpleApiJson<{ item: SdkListingSummary }>(
    `/v1/listings/${listingId}`,
    {
      timeoutMs: 8_000,
      retries: 0
    }
  );
}

export async function deleteOwnedListing(params: {
  accessToken: string;
  listingId: string;
}): Promise<SdkDeleteListingResponse> {
  return requestSimpleApiJson<SdkDeleteListingResponse>(`/v1/listings/${params.listingId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${params.accessToken}`
    },
    timeoutMs: 10_000,
    retries: 0
  });
}

export async function upsertListing(input: SdkUpsertListingInput): Promise<SdkUpsertListingResponse> {
  const payload = await requestSimpleApiJson<any>("/v1/listings/upsert", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`
    },
    body: {
      vertical: input.vertical,
      listingId: input.listingId,
      listing: input.listing,
      detail: input.detail,
      images: input.images ?? [],
      documents: input.documents ?? [],
      replaceImages: input.replaceImages ?? true
    },
    timeoutMs: 15_000,
    retries: 0
  });

  if (!payload?.id) {
    throw new Error("simple-api upsert failed: respuesta sin id");
  }

  return {
    id: String(payload.id),
    created: Boolean(payload.created),
    updatedAt: payload.updatedAt ? String(payload.updatedAt) : undefined
  };
}
