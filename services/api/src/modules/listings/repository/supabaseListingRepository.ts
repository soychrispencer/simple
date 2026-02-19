import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ListingMediaSchema,
  ListingSummarySchema,
  type Vertical
} from "../contracts.js";
import type {
  ListListingsQuery,
  ListingMedia,
  ListingRepository,
  ListingSummary
} from "./types.js";

const VERTICAL_TO_DB: Record<Vertical, string> = {
  autos: "vehicles",
  properties: "properties",
  stores: "stores",
  food: "food"
};

const DB_TO_VERTICAL: Record<string, Vertical> = {
  vehicles: "autos",
  properties: "properties",
  stores: "stores",
  food: "food"
};

type ListingRow = {
  id: string;
  listing_type: string;
  title: string;
  price: number | null;
  currency: string | null;
  published_at: string | null;
  created_at: string | null;
  location: string | null;
  verticals?: { key?: string | null } | Array<{ key?: string | null }> | null;
  communes?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type ImageRow = {
  id: string;
  listing_id: string;
  url: string;
  position: number | null;
};

function normalizeVertical(dbVertical: string | null | undefined): Vertical | null {
  if (!dbVertical) {
    return null;
  }
  return DB_TO_VERTICAL[dbVertical] ?? null;
}

function extractCommuneName(
  communes: { name?: string | null } | Array<{ name?: string | null }> | null | undefined
): string | null {
  if (!communes) {
    return null;
  }
  if (Array.isArray(communes)) {
    return communes[0]?.name ?? null;
  }
  return communes.name ?? null;
}

function extractVerticalKey(
  verticals:
    | { key?: string | null }
    | Array<{ key?: string | null }>
    | null
    | undefined
): string | null {
  if (!verticals) {
    return null;
  }
  if (Array.isArray(verticals)) {
    return verticals[0]?.key ?? null;
  }
  return verticals.key ?? null;
}

function cityFromRow(row: ListingRow): string {
  const commune = extractCommuneName(row.communes);
  if (commune) {
    return commune;
  }

  if (row.location) {
    const firstToken = row.location.split(",")[0]?.trim();
    if (firstToken) {
      return firstToken;
    }
  }

  return "Sin comuna";
}

function publishedAtFromRow(row: ListingRow): string {
  return row.published_at ?? row.created_at ?? new Date(0).toISOString();
}

function mapListingRow(row: ListingRow): ListingSummary | null {
  const verticalKey = extractVerticalKey(row.verticals);
  const vertical = normalizeVertical(verticalKey);
  if (!vertical) {
    return null;
  }

  const parsed = ListingSummarySchema.safeParse({
    id: row.id,
    vertical,
    type: row.listing_type,
    title: row.title,
    price: Number(row.price ?? 0),
    currency: row.currency ?? "CLP",
    city: cityFromRow(row),
    publishedAt: publishedAtFromRow(row)
  });

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export class SupabaseListingRepository implements ListingRepository {
  private readonly client: SupabaseClient;

  constructor(params: { url: string; serviceRoleKey: string }) {
    this.client = createClient(params.url, params.serviceRoleKey, {
      auth: { persistSession: false }
    });
  }

  async list(query: ListListingsQuery): Promise<{ items: ListingSummary[]; total: number }> {
    let builder = this.client
      .from("listings")
      .select(
        "id, listing_type, title, price, currency, published_at, created_at, location, verticals!inner(key), communes(name)",
        { count: "exact" }
      )
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(query.offset, query.offset + query.limit - 1);

    if (query.vertical) {
      builder = builder.eq("verticals.key", VERTICAL_TO_DB[query.vertical]);
    }
    if (query.type) {
      builder = builder.eq("listing_type", query.type);
    }

    const { data, error, count } = await builder;
    if (error) {
      throw new Error(`Failed to list listings from Supabase: ${error.message}`);
    }

    const items = ((data ?? []) as ListingRow[])
      .map((row) => mapListingRow(row))
      .filter((item): item is ListingSummary => Boolean(item));

    return { items, total: count ?? items.length };
  }

  async findById(listingId: string): Promise<ListingSummary | null> {
    const { data, error } = await this.client
      .from("listings")
      .select(
        "id, listing_type, title, price, currency, published_at, created_at, location, verticals!inner(key), communes(name)"
      )
      .eq("status", "published")
      .eq("id", listingId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch listing ${listingId}: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapListingRow(data as ListingRow);
  }

  async listMedia(listingId: string): Promise<ListingMedia[]> {
    const { data, error } = await this.client
      .from("images")
      .select("id, listing_id, url, position")
      .eq("listing_id", listingId)
      .order("position", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch media for listing ${listingId}: ${error.message}`);
    }

    return ((data ?? []) as ImageRow[])
      .map((row) =>
        ListingMediaSchema.safeParse({
          id: row.id,
          listingId: row.listing_id,
          url: row.url,
          kind: "image",
          order: row.position ?? 0
        })
      )
      .filter((result) => result.success)
      .map((result) => result.data);
  }
}
