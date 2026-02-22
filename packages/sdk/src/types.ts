import type { UnifiedPlanKey, VerticalKey } from "@simple/shared-types";

export type SdkListingType = "sale" | "rent" | "auction";

export interface SdkListingSummary {
  id: string;
  vertical: VerticalKey | string;
  type: SdkListingType;
  title: string;
  description?: string;
  price: number;
  currency: string;
  city: string;
  region?: string;
  location?: string;
  status?: string;
  regionId?: string;
  communeId?: string;
  ownerId?: string;
  createdAt?: string;
  imageUrl?: string;
  typeId?: string;
  typeKey?: string;
  typeLabel?: string;
  brandId?: string;
  brandName?: string;
  modelId?: string;
  modelName?: string;
  year?: number;
  mileage?: number;
  bodyType?: string;
  transmission?: string;
  fuelType?: string;
  color?: string;
  condition?: string;
  allowFinancing?: boolean;
  allowExchange?: boolean;
  featured?: boolean;
  visibility?: string;
  rentDailyPrice?: number;
  rentWeeklyPrice?: number;
  rentMonthlyPrice?: number;
  rentPricePeriod?: "daily" | "weekly" | "monthly";
  rentSecurityDeposit?: number;
  auctionStartPrice?: number;
  auctionStartAt?: string;
  auctionEndAt?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaM2?: number;
  areaBuiltM2?: number;
  parkingSpaces?: number;
  floor?: number;
  totalFloors?: number;
  isFurnished?: boolean;
  allowsPets?: boolean;
  metadata?: Record<string, unknown>;
  tags?: string[];
  features?: string[];
  amenities?: string[];
  publishedAt?: string;
}

export interface SdkListingsResponse {
  items: SdkListingSummary[];
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface SdkListingMediaItem {
  id?: string;
  listingId?: string;
  url: string;
  kind: "image" | "video";
  order?: number;
}

export interface SdkListingMediaResponse {
  items: SdkListingMediaItem[];
}

export interface SdkUpsertListingInput {
  accessToken: string;
  vertical: "autos" | "properties" | "stores" | "food";
  listingId?: string;
  listing: Record<string, unknown>;
  detail?: Record<string, unknown>;
  images?: Array<{
    url: string;
    is_primary?: boolean;
    position?: number;
  }>;
  documents?: Array<{
    record_id?: string;
    name: string;
    type?: string | null;
    size?: number | null;
    is_public?: boolean;
    path: string;
  }>;
  replaceImages?: boolean;
}

export interface SdkUpsertListingResponse {
  id: string;
  created?: boolean;
  updatedAt?: string;
}

export interface SdkPublishQueueInput {
  listingId: string;
  vertical: "autos" | "properties" | "stores" | "food";
  reason?: "new_publish" | "manual_retry";
}

export interface SdkPublishQueueResponse {
  status: "accepted";
  jobId: string;
  queuedAt: string;
}

export interface SdkDeleteListingResponse {
  deleted: boolean;
  id: string;
}

export interface SdkProfileSummary {
  id?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  publicName?: string | null;
  planKey?: UnifiedPlanKey;
}
