import type {
  ListingMediaSchema,
  ListingSummarySchema,
  ListListingsQuerySchema
} from "../contracts.js";
import type { z } from "zod";

export type ListListingsQuery = z.infer<typeof ListListingsQuerySchema>;
export type ListingSummary = z.infer<typeof ListingSummarySchema>;
export type ListingMedia = z.infer<typeof ListingMediaSchema>;

export interface ListingRepository {
  list(query: ListListingsQuery): Promise<{ items: ListingSummary[]; total: number }>;
  findById(listingId: string): Promise<ListingSummary | null>;
  listMedia(listingId: string): Promise<ListingMedia[]>;
}
