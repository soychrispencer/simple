import type {
  ListingWriteDocumentSchema,
  ListingWriteImageSchema,
  ListingMediaSchema,
  VerticalSchema,
  ListingSummarySchema,
  ListListingsQuerySchema
} from "../contracts.js";
import type { z } from "zod";

export type ListListingsQuery = z.infer<typeof ListListingsQuerySchema>;
export type ListingSummary = z.infer<typeof ListingSummarySchema>;
export type ListingMedia = z.infer<typeof ListingMediaSchema>;
export type ListingWriteImage = z.infer<typeof ListingWriteImageSchema>;
export type ListingWriteDocument = z.infer<typeof ListingWriteDocumentSchema>;
export type Vertical = z.infer<typeof VerticalSchema>;

export interface UpsertListingInput {
  vertical: Vertical;
  listingId?: string;
  authUserId: string;
  listing: Record<string, unknown>;
  detail?: Record<string, unknown>;
  images: ListingWriteImage[];
  documents?: ListingWriteDocument[];
  replaceImages: boolean;
}

export interface UpsertListingResult {
  id: string;
  created: boolean;
  updatedAt: string;
}

export interface ListingRepository {
  list(query: ListListingsQuery): Promise<{ items: ListingSummary[]; total: number }>;
  findById(listingId: string): Promise<ListingSummary | null>;
  listMedia(listingId: string): Promise<ListingMedia[]>;
  resolveAuthUserId(accessToken: string): Promise<string | null>;
  upsertListing(input: UpsertListingInput): Promise<UpsertListingResult>;
}
