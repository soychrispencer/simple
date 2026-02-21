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
  ListingSummary,
  UpsertListingInput,
  UpsertListingResult
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

type DocumentRow = {
  id: string;
  url: string;
  name: string;
  file_type: string | null;
  file_size: number | null;
  is_public: boolean | null;
};

function extractDocumentPath(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const value = String(urlOrPath);
  const marker = "/documents/";
  const idx = value.indexOf(marker);
  if (idx === -1) return value;
  return value.slice(idx + marker.length);
}

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

  private async resolveVerticalId(vertical: Vertical): Promise<string> {
    const keyCandidates = vertical === "autos" ? ["vehicles", "autos"] : [VERTICAL_TO_DB[vertical]];

    const { data, error } = await this.client
      .from("verticals")
      .select("id, key")
      .in("key", keyCandidates)
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) {
      throw new Error(
        `Failed to resolve vertical id (${vertical}): ${error?.message ?? "missing vertical"}`
      );
    }

    return String(data.id);
  }

  private async ensureOwnerPublicProfileId(authUserId: string): Promise<string> {
    const { data: activeProfile, error: activeError } = await this.client
      .from("public_profiles")
      .select("id")
      .eq("owner_profile_id", authUserId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (activeError) {
      throw new Error(`Failed to query active public_profile: ${activeError.message}`);
    }

    if (activeProfile?.id) {
      return String(activeProfile.id);
    }

    const { data: draftProfile, error: draftError } = await this.client
      .from("public_profiles")
      .select("id")
      .eq("owner_profile_id", authUserId)
      .eq("status", "draft")
      .limit(1)
      .maybeSingle();

    if (draftError) {
      throw new Error(`Failed to query draft public_profile: ${draftError.message}`);
    }

    if (draftProfile?.id) {
      return String(draftProfile.id);
    }

    const slug = `u-${authUserId}`;
    const { data: created, error: createError } = await this.client
      .from("public_profiles")
      .insert({
        owner_profile_id: authUserId,
        slug,
        status: "draft",
        is_public: false
      })
      .select("id")
      .single();

    if (createError || !created?.id) {
      throw new Error(`Failed to create public_profile: ${createError?.message ?? "unknown error"}`);
    }

    return String(created.id);
  }

  private sanitizeListingPayload(input: Record<string, unknown>) {
    const next = { ...input };
    delete (next as Record<string, unknown>).id;
    delete (next as Record<string, unknown>).user_id;
    delete (next as Record<string, unknown>).vertical_id;
    delete (next as Record<string, unknown>).public_profile_id;
    delete (next as Record<string, unknown>).created_at;
    delete (next as Record<string, unknown>).updated_at;
    return next;
  }

  private async resolvePlanLimits(input: { authUserId: string; verticalId: string }) {
    const readPlanLimits = async (withVertical: boolean) => {
      let query = this.client
        .from("subscriptions")
        .select("subscription_plans(limits)")
        .eq("user_id", input.authUserId)
        .eq("status", "active")
        .limit(1);

      if (withVertical) {
        query = query.eq("vertical_id", input.verticalId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) {
        throw new Error(`Failed to resolve subscription limits: ${error.message}`);
      }

      const source = Array.isArray((data as any)?.subscription_plans)
        ? (data as any)?.subscription_plans?.[0]
        : (data as any)?.subscription_plans;

      return (source?.limits ?? null) as Record<string, unknown> | null;
    };

    let limits = await readPlanLimits(true);
    if (!limits) {
      limits = await readPlanLimits(false);
    }

    return limits;
  }

  private async resolveMaxActiveListings(input: {
    authUserId: string;
    verticalId: string;
  }): Promise<number> {
    const limits = await this.resolvePlanLimits(input);

    const raw = Number((limits as any)?.max_active_listings ?? (limits as any)?.max_listings);
    if (Number.isFinite(raw)) {
      return raw;
    }

    // Free tier default aligned with frontend constants.
    return 1;
  }

  private async resolveMaxTotalListings(input: {
    authUserId: string;
    verticalId: string;
  }): Promise<number> {
    const limits = await this.resolvePlanLimits(input);
    const raw = Number((limits as any)?.max_total_listings ?? (limits as any)?.max_listings);
    if (Number.isFinite(raw)) {
      return raw;
    }

    // Aligned with DB function listing_create_limit_ok_v2.
    return 1;
  }

  private async enforceCreateLimit(input: {
    authUserId: string;
    verticalId: string;
    listingId?: string;
  }): Promise<void> {
    const maxTotalListings = await this.resolveMaxTotalListings({
      authUserId: input.authUserId,
      verticalId: input.verticalId
    });

    if (maxTotalListings < 0) return;

    let countQuery = this.client
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.authUserId)
      .eq("vertical_id", input.verticalId);

    if (input.listingId) {
      countQuery = countQuery.neq("id", input.listingId);
    }

    const { count, error } = await countQuery;
    if (error) {
      throw new Error(`Failed to validate create limit: ${error.message}`);
    }

    const totalCount = Number(count ?? 0);
    if (totalCount >= maxTotalListings) {
      throw new Error(`create_limit_exceeded:${maxTotalListings}`);
    }
  }

  private async enforcePublishedLimit(input: {
    authUserId: string;
    verticalId: string;
    listingId?: string;
    nextStatus: string | null;
  }): Promise<void> {
    if (input.nextStatus !== "published") return;

    const maxActiveListings = await this.resolveMaxActiveListings({
      authUserId: input.authUserId,
      verticalId: input.verticalId
    });

    if (maxActiveListings < 0) return;

    let countQuery = this.client
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.authUserId)
      .eq("vertical_id", input.verticalId)
      .eq("status", "published");

    if (input.listingId) {
      countQuery = countQuery.neq("id", input.listingId);
    }

    const { count, error } = await countQuery;
    if (error) {
      throw new Error(`Failed to validate publish limit: ${error.message}`);
    }

    const activeCount = Number(count ?? 0);
    if (activeCount >= maxActiveListings) {
      throw new Error(`publish_limit_exceeded:${maxActiveListings}`);
    }
  }

  private sanitizeDetailPayload(input: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!input || typeof input !== "object") return {};
    const next = { ...input };
    delete (next as Record<string, unknown>).id;
    delete (next as Record<string, unknown>).listing_id;
    return next;
  }

  private async replaceListingImages(listingId: string, images: UpsertListingInput["images"]) {
    const { error: deleteError } = await this.client.from("images").delete().eq("listing_id", listingId);
    if (deleteError) {
      throw new Error(`Failed to delete images for ${listingId}: ${deleteError.message}`);
    }

    if (!Array.isArray(images) || images.length === 0) return;

    const rows = images.map((image, index) => ({
      listing_id: listingId,
      url: image.url,
      is_primary: index === 0 || !!image.is_primary,
      position: index,
      alt_text: null
    }));

    const { error: insertError } = await this.client.from("images").insert(rows);
    if (insertError) {
      throw new Error(`Failed to insert images for ${listingId}: ${insertError.message}`);
    }
  }

  private async syncListingDocuments(
    listingId: string,
    authUserId: string,
    documents: NonNullable<UpsertListingInput["documents"]>
  ) {
    const desired = (documents || [])
      .map((item) => ({
        recordId: item.record_id ? String(item.record_id) : null,
        name: String(item.name || "documento"),
        fileType: item.type ? String(item.type) : null,
        fileSize: typeof item.size === "number" ? Number(item.size) : null,
        isPublic: !!item.is_public,
        path: extractDocumentPath(item.path)
      }))
      .filter((item) => !!item.path);

    const { data: existingRows, error: existingError } = await this.client
      .from("documents")
      .select("id, url, name, file_type, file_size, is_public")
      .eq("listing_id", listingId);

    if (existingError) {
      throw new Error(`Failed to fetch documents for ${listingId}: ${existingError.message}`);
    }

    const existing = (existingRows || []) as DocumentRow[];
    const desiredIds = new Set(desired.map((item) => item.recordId).filter(Boolean) as string[]);
    const desiredPaths = new Set(desired.map((item) => String(item.path)));

    const toDelete = existing.filter((row) => {
      const rowId = String(row.id);
      const rowPath = extractDocumentPath(row.url);
      if (desiredIds.has(rowId)) return false;
      if (rowPath && desiredPaths.has(rowPath)) return false;
      return true;
    });

    if (toDelete.length > 0) {
      const { error: deleteError } = await this.client
        .from("documents")
        .delete()
        .in("id", toDelete.map((row) => row.id));
      if (deleteError) {
        throw new Error(`Failed to delete documents for ${listingId}: ${deleteError.message}`);
      }
    }

    const existingById = new Map(existing.map((row) => [String(row.id), row] as const));

    for (const item of desired) {
      if (!item.recordId) continue;
      const row = existingById.get(item.recordId);
      if (!row) continue;

      const nextUrl = String(item.path);
      const nextName = item.name;
      const nextType = item.fileType;
      const nextSize = item.fileSize;
      const nextPublic = item.isPublic;
      const changed =
        String(row.url || "") !== nextUrl ||
        String(row.name || "") !== nextName ||
        String(row.file_type || "") !== String(nextType || "") ||
        Number(row.file_size ?? -1) !== Number(nextSize ?? -1) ||
        Boolean(row.is_public) !== nextPublic;

      if (!changed) continue;

      const { error: updateError } = await this.client
        .from("documents")
        .update({
          url: nextUrl,
          name: nextName,
          file_type: nextType,
          file_size: nextSize,
          is_public: nextPublic
        })
        .eq("id", item.recordId);

      if (updateError) {
        throw new Error(`Failed to update document ${item.recordId}: ${updateError.message}`);
      }
    }

    const toInsert = desired.filter((item) => !item.recordId);
    if (toInsert.length > 0) {
      const { error: insertError } = await this.client.from("documents").insert(
        toInsert.map((item) => ({
          listing_id: listingId,
          user_id: authUserId,
          name: item.name,
          url: item.path,
          file_type: item.fileType,
          file_size: item.fileSize,
          is_public: item.isPublic
        }))
      );
      if (insertError) {
        throw new Error(`Failed to insert documents for ${listingId}: ${insertError.message}`);
      }
    }

    const { data: publicRows, error: publicError } = await this.client
      .from("documents")
      .select("url")
      .eq("listing_id", listingId)
      .eq("is_public", true);

    if (publicError) {
      throw new Error(`Failed to resolve public document urls for ${listingId}: ${publicError.message}`);
    }

    const publicPaths = (publicRows || [])
      .map((row: any) => extractDocumentPath(row?.url))
      .filter(Boolean);

    const { error: listingUpdateError } = await this.client
      .from("listings")
      .update({ document_urls: publicPaths })
      .eq("id", listingId);

    if (listingUpdateError) {
      throw new Error(
        `Failed to update listing document_urls for ${listingId}: ${listingUpdateError.message}`
      );
    }
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

  async resolveAuthUserId(accessToken: string): Promise<string | null> {
    const token = String(accessToken || "").trim();
    if (!token) return null;

    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data?.user?.id) {
      return null;
    }

    return String(data.user.id);
  }

  async upsertListing(input: UpsertListingInput): Promise<UpsertListingResult> {
    const now = new Date().toISOString();
    const verticalId = await this.resolveVerticalId(input.vertical);
    const ownerPublicProfileId = await this.ensureOwnerPublicProfileId(input.authUserId);

    const listingPayload = this.sanitizeListingPayload(input.listing);
    const detailPayload = this.sanitizeDetailPayload(input.detail);

    const nextListingBase: Record<string, unknown> = {
      ...listingPayload,
      user_id: input.authUserId,
      vertical_id: verticalId,
      public_profile_id: ownerPublicProfileId,
      updated_at: now
    };

    if (input.listingId) {
      const { data: existing, error: existingError } = await this.client
        .from("listings")
        .select("id, user_id, created_at, published_at, metadata")
        .eq("id", input.listingId)
        .eq("user_id", input.authUserId)
        .maybeSingle();

      if (existingError) {
        throw new Error(`Failed to fetch listing ${input.listingId}: ${existingError.message}`);
      }

      if (!existing?.id) {
        throw new Error("Listing not found or access denied");
      }

      const nextListingUpdate: Record<string, unknown> = {
        ...nextListingBase,
        created_at: existing.created_at ?? now
      };

      await this.enforcePublishedLimit({
        authUserId: input.authUserId,
        verticalId,
        listingId: input.listingId,
        nextStatus: String(nextListingUpdate.status ?? "")
      });

      if (nextListingUpdate.status === "published") {
        nextListingUpdate.published_at = existing.published_at ?? now;
      } else {
        nextListingUpdate.published_at = null;
      }

      const { error: updateError } = await this.client
        .from("listings")
        .update(nextListingUpdate)
        .eq("id", input.listingId);

      if (updateError) {
        throw new Error(`Failed to update listing ${input.listingId}: ${updateError.message}`);
      }

      if (input.vertical === "autos") {
        const { error: vehicleError } = await this.client
          .from("listings_vehicles")
          .upsert({ ...detailPayload, listing_id: input.listingId }, { onConflict: "listing_id" });
        if (vehicleError) {
          throw new Error(`Failed to upsert listings_vehicles: ${vehicleError.message}`);
        }
      }

      if (input.vertical === "properties") {
        const { error: propertyError } = await this.client
          .from("listings_properties")
          .upsert({ ...detailPayload, listing_id: input.listingId }, { onConflict: "listing_id" });
        if (propertyError) {
          throw new Error(`Failed to upsert listings_properties: ${propertyError.message}`);
        }
      }

      if (input.replaceImages) {
        await this.replaceListingImages(input.listingId, input.images);
      }

      if (input.documents) {
        await this.syncListingDocuments(input.listingId, input.authUserId, input.documents);
      }

      const { error: metricsError } = await this.client
        .from("listing_metrics")
        .upsert(
          { listing_id: input.listingId, views: 0, clicks: 0, favorites: 0, shares: 0 },
          { onConflict: "listing_id" }
        );

      if (metricsError) {
        throw new Error(`Failed to ensure listing_metrics: ${metricsError.message}`);
      }

      return {
        id: input.listingId,
        created: false,
        updatedAt: now
      };
    }

    const createPayload: Record<string, unknown> = {
      ...nextListingBase,
      created_at: now,
      published_at: nextListingBase.status === "published" ? now : null
    };

    await this.enforcePublishedLimit({
      authUserId: input.authUserId,
      verticalId,
      nextStatus: String(createPayload.status ?? "")
    });

    await this.enforceCreateLimit({
      authUserId: input.authUserId,
      verticalId
    });

    const { data: inserted, error: insertError } = await this.client
      .from("listings")
      .insert(createPayload)
      .select("id")
      .single();

    if (insertError || !inserted?.id) {
      throw new Error(`Failed to create listing: ${insertError?.message ?? "unknown error"}`);
    }

    const listingId = String(inserted.id);

    if (input.vertical === "autos") {
      const { error: vehicleInsertError } = await this.client
        .from("listings_vehicles")
        .insert({ ...detailPayload, listing_id: listingId });
      if (vehicleInsertError) {
        throw new Error(`Failed to insert listings_vehicles: ${vehicleInsertError.message}`);
      }
    }

    if (input.vertical === "properties") {
      const { error: propertyInsertError } = await this.client
        .from("listings_properties")
        .insert({ ...detailPayload, listing_id: listingId });
      if (propertyInsertError) {
        throw new Error(`Failed to insert listings_properties: ${propertyInsertError.message}`);
      }
    }

    if (input.replaceImages) {
      await this.replaceListingImages(listingId, input.images);
    }

    if (input.documents) {
      await this.syncListingDocuments(listingId, input.authUserId, input.documents);
    }

    const { error: metricsError } = await this.client
      .from("listing_metrics")
      .upsert(
        { listing_id: listingId, views: 0, clicks: 0, favorites: 0, shares: 0 },
        { onConflict: "listing_id" }
      );

    if (metricsError) {
      throw new Error(`Failed to ensure listing_metrics: ${metricsError.message}`);
    }

    return {
      id: listingId,
      created: true,
      updatedAt: now
    };
  }
}
