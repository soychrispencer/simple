import { LISTING_FIXTURES, LISTING_MEDIA_FIXTURES } from "../fixtures.js";
import type {
  ListListingsQuery,
  MyListingsQuery,
  ListingMedia,
  ListingRepository,
  ListingSummary,
  UpsertListingInput,
  UpsertListingResult
} from "./types.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  async listMine(
    authUserId: string,
    query: MyListingsQuery
  ): Promise<{ items: ListingSummary[]; total: number }> {
    const filtered = LISTING_FIXTURES.filter((item) => {
      if (item.ownerId && item.ownerId !== authUserId) return false;
      if (query.vertical && item.vertical !== query.vertical) return false;
      if (query.type && item.type !== query.type) return false;
      if (query.status && item.status !== query.status) return false;
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

  async resolveAuthUserId(accessToken: string): Promise<string | null> {
    const token = String(accessToken || "").trim();
    if (UUID_REGEX.test(token)) return token;
    return null;
  }

  async deleteOwnedListing(authUserId: string, listingId: string): Promise<boolean> {
    const found = LISTING_FIXTURES.find((item) => item.id === listingId);
    if (!found) return false;
    if (found.ownerId && found.ownerId !== authUserId) return false;
    return true;
  }

  async upsertListing(_input: UpsertListingInput): Promise<UpsertListingResult> {
    throw new Error("Listing writes are not supported with LISTINGS_REPOSITORY=memory");
  }
}
