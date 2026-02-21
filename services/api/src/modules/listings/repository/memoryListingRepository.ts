import { LISTING_FIXTURES, LISTING_MEDIA_FIXTURES } from "../fixtures.js";
import type {
  ListListingsQuery,
  ListingMedia,
  ListingRepository,
  ListingSummary,
  UpsertListingInput,
  UpsertListingResult
} from "./types.js";

export class MemoryListingRepository implements ListingRepository {
  async list(query: ListListingsQuery): Promise<{ items: ListingSummary[]; total: number }> {
    const filtered = LISTING_FIXTURES.filter((item) => {
      if (query.vertical && item.vertical !== query.vertical) {
        return false;
      }
      if (query.type && item.type !== query.type) {
        return false;
      }
      return true;
    });

    return {
      items: filtered.slice(query.offset, query.offset + query.limit),
      total: filtered.length
    };
  }

  async findById(listingId: string): Promise<ListingSummary | null> {
    return LISTING_FIXTURES.find((item) => item.id === listingId) ?? null;
  }

  async listMedia(listingId: string): Promise<ListingMedia[]> {
    const media =
      LISTING_MEDIA_FIXTURES[listingId as keyof typeof LISTING_MEDIA_FIXTURES] ?? [];
    return media.map((item) => ({ ...item }));
  }

  async resolveAuthUserId(_accessToken: string): Promise<string | null> {
    return null;
  }

  async upsertListing(_input: UpsertListingInput): Promise<UpsertListingResult> {
    throw new Error("Listing writes are not supported with LISTINGS_REPOSITORY=memory");
  }
}
