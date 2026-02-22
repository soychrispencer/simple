import { Buffer } from "node:buffer";
import { Pool, type PoolClient } from "pg";
import {
  ListingMediaSchema,
  ListingSummarySchema,
  type Vertical
} from "../contracts.js";
import type {
  ListListingsQuery,
  MyListingsQuery,
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
  autos: "autos",
  properties: "properties",
  stores: "stores",
  food: "food"
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_LISTING_COLUMNS = new Set([
  "listing_type",
  "title",
  "description",
  "price",
  "currency",
  "status",
  "visibility",
  "allow_financing",
  "allow_exchange",
  "contact_phone",
  "contact_email",
  "contact_whatsapp",
  "location",
  "region_id",
  "commune_id",
  "metadata",
  "tags",
  "document_urls",
  "rent_daily_price",
  "rent_weekly_price",
  "rent_monthly_price",
  "rent_security_deposit",
  "auction_start_price",
  "auction_start_at",
  "auction_end_at",
  "is_featured"
]);

const ALLOWED_AUTO_DETAIL_COLUMNS = new Set([
  "vehicle_type_id",
  "brand_id",
  "model_id",
  "year",
  "mileage",
  "transmission",
  "fuel_type",
  "body_type",
  "color",
  "condition"
]);

const ALLOWED_PROPERTY_DETAIL_COLUMNS = new Set([
  "property_type",
  "bedrooms",
  "bathrooms",
  "total_area",
  "built_area",
  "parking_spaces",
  "floor",
  "building_floors",
  "furnished",
  "pet_friendly",
  "features",
  "amenities"
]);

type ListingQueryRow = {
  id: string;
  listing_type: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  status: string | null;
  allow_financing: boolean | null;
  allow_exchange: boolean | null;
  is_featured: boolean | null;
  visibility: string | null;
  rent_daily_price: number | null;
  rent_weekly_price: number | null;
  rent_monthly_price: number | null;
  rent_security_deposit: number | null;
  auction_start_price: number | null;
  auction_start_at: string | null;
  auction_end_at: string | null;
  published_at: string | null;
  created_at: string | null;
  location: string | null;
  region_id: string | null;
  commune_id: string | null;
  user_id: string | null;
  vertical_key: string | null;
  commune_name: string | null;
  region_name: string | null;
  image_url: string | null;
  vehicle_type_id: string | null;
  vehicle_type_key: string | null;
  vehicle_type_label: string | null;
  brand_id: string | null;
  brand_name: string | null;
  model_id: string | null;
  model_name: string | null;
  year: number | null;
  mileage: number | null;
  body_type: string | null;
  transmission: string | null;
  fuel_type: string | null;
  color: string | null;
  condition: string | null;
  property_type: string | null;
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  bedrooms: number | null;
  bathrooms: number | null;
  total_area: number | null;
  built_area: number | null;
  parking_spaces: number | null;
  floor: number | null;
  building_floors: number | null;
  furnished: boolean | null;
  pet_friendly: boolean | null;
  features: string[] | null;
  amenities: string[] | null;
  total_count?: number | null;
};

function normalizeVertical(value: string | null | undefined): Vertical | null {
  if (!value) return null;
  return DB_TO_VERTICAL[String(value)] ?? null;
}

function cityFromRow(row: ListingQueryRow): string {
  if (row.commune_name) return row.commune_name;
  if (row.location) {
    const token = row.location.split(",")[0]?.trim();
    if (token) return token;
  }
  return "Sin comuna";
}

function publishedAtFromRow(row: ListingQueryRow): string {
  return row.published_at ?? row.created_at ?? new Date(0).toISOString();
}

function mapRow(row: ListingQueryRow): ListingSummary | null {
  const vertical = normalizeVertical(row.vertical_key);
  if (!vertical) return null;

  const features = Array.isArray(row.features) ? row.features : undefined;
  const amenities = Array.isArray(row.amenities) ? row.amenities : undefined;
  const metadata =
    row.metadata && typeof row.metadata === "object" ? row.metadata : undefined;
  const tags = Array.isArray(row.tags)
    ? row.tags.filter((item): item is string => typeof item === "string")
    : undefined;

  const parsed = ListingSummarySchema.safeParse({
    id: row.id,
    vertical,
    type: row.listing_type,
    title: row.title,
    description: row.description ?? undefined,
    price: Number(row.price ?? 0),
    currency: row.currency ?? "CLP",
    city: cityFromRow(row),
    region: row.region_name ?? undefined,
    location: row.location ?? undefined,
    status: row.status ?? undefined,
    regionId: row.region_id ?? undefined,
    communeId: row.commune_id ?? undefined,
    ownerId: row.user_id ?? undefined,
    createdAt: row.created_at ?? undefined,
    imageUrl: row.image_url ?? undefined,
    typeId: row.vehicle_type_id ?? undefined,
    typeKey: row.vehicle_type_key ?? undefined,
    typeLabel: row.vehicle_type_label ?? undefined,
    brandId: row.brand_id ?? undefined,
    brandName: row.brand_name ?? undefined,
    modelId: row.model_id ?? undefined,
    modelName: row.model_name ?? undefined,
    year: typeof row.year === "number" ? row.year : undefined,
    mileage: typeof row.mileage === "number" ? row.mileage : undefined,
    bodyType: row.body_type ?? undefined,
    transmission: row.transmission ?? undefined,
    fuelType: row.fuel_type ?? undefined,
    color: row.color ?? undefined,
    condition: row.condition ?? undefined,
    allowFinancing:
      typeof row.allow_financing === "boolean" ? row.allow_financing : undefined,
    allowExchange:
      typeof row.allow_exchange === "boolean" ? row.allow_exchange : undefined,
    featured: typeof row.is_featured === "boolean" ? row.is_featured : undefined,
    visibility: row.visibility ?? undefined,
    rentDailyPrice:
      typeof row.rent_daily_price === "number" ? row.rent_daily_price : undefined,
    rentWeeklyPrice:
      typeof row.rent_weekly_price === "number" ? row.rent_weekly_price : undefined,
    rentMonthlyPrice:
      typeof row.rent_monthly_price === "number" ? row.rent_monthly_price : undefined,
    rentSecurityDeposit:
      typeof row.rent_security_deposit === "number"
        ? row.rent_security_deposit
        : undefined,
    auctionStartPrice:
      typeof row.auction_start_price === "number" ? row.auction_start_price : undefined,
    auctionStartAt: row.auction_start_at ?? undefined,
    auctionEndAt: row.auction_end_at ?? undefined,
    propertyType: row.property_type ?? undefined,
    bedrooms: typeof row.bedrooms === "number" ? row.bedrooms : undefined,
    bathrooms: typeof row.bathrooms === "number" ? row.bathrooms : undefined,
    areaM2: typeof row.total_area === "number" ? row.total_area : undefined,
    areaBuiltM2: typeof row.built_area === "number" ? row.built_area : undefined,
    parkingSpaces:
      typeof row.parking_spaces === "number" ? row.parking_spaces : undefined,
    floor: typeof row.floor === "number" ? row.floor : undefined,
    totalFloors:
      typeof row.building_floors === "number" ? row.building_floors : undefined,
    isFurnished: typeof row.furnished === "boolean" ? row.furnished : undefined,
    allowsPets: typeof row.pet_friendly === "boolean" ? row.pet_friendly : undefined,
    metadata,
    tags,
    features,
    amenities,
    publishedAt: publishedAtFromRow(row)
  });

  return parsed.success ? parsed.data : null;
}

function decodeJwtSub(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const payloadPart = parts[1];
  if (!payloadPart) return null;
  const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  try {
    const json = Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as { sub?: unknown };
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    if (UUID_REGEX.test(sub)) return sub;
    return null;
  } catch {
    return null;
  }
}

function extractDocumentPath(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const value = String(urlOrPath);
  const marker = "/documents/";
  const idx = value.indexOf(marker);
  if (idx === -1) return value;
  return value.slice(idx + marker.length);
}

function pickAllowed(
  input: Record<string, unknown> | undefined,
  allowed: Set<string>
): Record<string, unknown> {
  if (!input) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) continue;
    out[key] = value;
  }
  return out;
}

function buildWhere(query: ListListingsQuery): { whereSql: string; params: unknown[] } {
  const params: unknown[] = [];
  const where: string[] = ["l.status = 'published'"];
  const p = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (query.vertical) {
    if (query.vertical === "autos") {
      where.push("v.key IN ('vehicles','autos')");
    } else {
      where.push(`v.key = ${p(VERTICAL_TO_DB[query.vertical])}`);
    }
  }
  if (query.type) where.push(`l.listing_type = ${p(query.type)}`);
  if (query.typeId) where.push(`lv.vehicle_type_id = ${p(query.typeId)}`);
  if (query.typeKey) where.push(`vt.slug = ${p(query.typeKey)}`);
  if (query.brandId) where.push(`lv.brand_id = ${p(query.brandId)}`);
  if (query.modelId) where.push(`lv.model_id = ${p(query.modelId)}`);
  if (query.bodyType) where.push(`lv.body_type = ${p(query.bodyType)}`);
  if (query.transmission) where.push(`lv.transmission = ${p(query.transmission)}`);
  if (query.fuelType) where.push(`lv.fuel_type = ${p(query.fuelType)}`);
  if (query.color) where.push(`lv.color = ${p(query.color)}`);
  if (query.estado) where.push(`lv.condition = ${p(query.estado)}`);
  if (typeof query.yearMin === "number") where.push(`lv.year >= ${p(query.yearMin)}`);
  if (typeof query.yearMax === "number") where.push(`lv.year <= ${p(query.yearMax)}`);
  if (query.financingAvailable === true) where.push("l.allow_financing = true");
  if (query.keyword) {
    const like = `%${query.keyword}%`;
    where.push(`(l.title ILIKE ${p(like)} OR COALESCE(l.description,'') ILIKE ${p(like)})`);
  }
  if (query.city) {
    where.push(
      `COALESCE(c.name, SPLIT_PART(COALESCE(l.location,''), ',', 1)) ILIKE ${p(
        `%${query.city}%`
      )}`
    );
  }
  if (query.regionId) where.push(`l.region_id = ${p(query.regionId)}`);
  if (query.communeId) where.push(`l.commune_id = ${p(query.communeId)}`);
  if (query.currency) where.push(`l.currency = ${p(query.currency)}`);
  if (typeof query.minPrice === "number") where.push(`l.price >= ${p(query.minPrice)}`);
  if (typeof query.maxPrice === "number") where.push(`l.price <= ${p(query.maxPrice)}`);

  if (query.visibility) {
    if (query.visibility === "normal") {
      where.push("COALESCE(l.visibility,'normal') IN ('normal','featured')");
    } else {
      where.push(`l.visibility = ${p(query.visibility)}`);
    }
  }

  if (query.propertyType) where.push(`lp.property_type = ${p(query.propertyType)}`);
  if (typeof query.minBedrooms === "number") where.push(`lp.bedrooms >= ${p(query.minBedrooms)}`);
  if (typeof query.minBathrooms === "number")
    where.push(`lp.bathrooms >= ${p(query.minBathrooms)}`);
  if (typeof query.minArea === "number") where.push(`lp.total_area >= ${p(query.minArea)}`);
  if (typeof query.maxArea === "number") where.push(`lp.total_area <= ${p(query.maxArea)}`);
  if (query.isFurnished === true) where.push("lp.furnished = true");
  if (query.allowsPets === true) where.push("lp.pet_friendly = true");
  if (query.hasParking === true) where.push("COALESCE(lp.parking_spaces, 0) >= 1");
  if (query.hasPool === true) where.push("COALESCE(lp.features, '{}'::text[]) @> ARRAY['pool']::text[]");
  if (query.hasGarden === true)
    where.push("COALESCE(lp.features, '{}'::text[]) @> ARRAY['garden']::text[]");
  if (query.hasTerrace === true)
    where.push("COALESCE(lp.features, '{}'::text[]) @> ARRAY['terrace']::text[]");
  if (query.hasBalcony === true)
    where.push("COALESCE(lp.features, '{}'::text[]) @> ARRAY['balcony']::text[]");
  if (query.hasElevator === true)
    where.push("COALESCE(lp.amenities, '{}'::text[]) @> ARRAY['elevator']::text[]");
  if (query.hasSecurity === true)
    where.push("COALESCE(lp.amenities, '{}'::text[]) @> ARRAY['security']::text[]");

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params
  };
}

function buildWhereMine(
  authUserId: string,
  query: MyListingsQuery
): { whereSql: string; params: unknown[] } {
  const params: unknown[] = [];
  const where: string[] = ["l.user_id = $1"];
  params.push(authUserId);
  const p = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (query.vertical) {
    if (query.vertical === "autos") {
      where.push("v.key IN ('vehicles','autos')");
    } else {
      where.push(`v.key = ${p(VERTICAL_TO_DB[query.vertical])}`);
    }
  }

  if (query.type) where.push(`l.listing_type = ${p(query.type)}`);
  if (query.status) where.push(`l.status = ${p(query.status)}`);

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params
  };
}

export class PostgresListingRepository implements ListingRepository {
  private readonly pool: Pool;

  constructor(params: { databaseUrl: string }) {
    this.pool = new Pool({
      connectionString: params.databaseUrl
    });
  }

  async list(query: ListListingsQuery): Promise<{ items: ListingSummary[]; total: number }> {
    const { whereSql, params } = buildWhere(query);
    const limitParam = `$${params.length + 1}`;
    const offsetParam = `$${params.length + 2}`;

    const sql = `
      SELECT
        l.id, l.listing_type, l.title, l.description, l.price, l.currency, l.status,
        l.allow_financing, l.allow_exchange, l.is_featured, l.visibility,
        l.rent_daily_price, l.rent_weekly_price, l.rent_monthly_price, l.rent_security_deposit,
        l.auction_start_price, l.auction_start_at, l.auction_end_at,
        l.published_at, l.created_at, l.location, l.region_id, l.commune_id, l.user_id,
        l.metadata, l.tags,
        v.key AS vertical_key,
        c.name AS commune_name,
        r.name AS region_name,
        img.url AS image_url,
        lv.vehicle_type_id, vt.slug AS vehicle_type_key, vt.name AS vehicle_type_label,
        lv.brand_id, b.name AS brand_name, lv.model_id, m.name AS model_name,
        lv.year, lv.mileage, lv.body_type, lv.transmission, lv.fuel_type, lv.color, lv.condition,
        lp.property_type, lp.bedrooms, lp.bathrooms, lp.total_area, lp.built_area,
        lp.parking_spaces, lp.floor, lp.building_floors, lp.furnished, lp.pet_friendly,
        lp.features, lp.amenities,
        COUNT(*) OVER()::int AS total_count
      FROM listings l
      INNER JOIN verticals v ON v.id = l.vertical_id
      LEFT JOIN communes c ON c.id = l.commune_id
      LEFT JOIN regions r ON r.id = l.region_id
      LEFT JOIN listings_vehicles lv ON lv.listing_id = l.id
      LEFT JOIN vehicle_types vt ON vt.id = lv.vehicle_type_id
      LEFT JOIN brands b ON b.id = lv.brand_id
      LEFT JOIN models m ON m.id = lv.model_id
      LEFT JOIN listings_properties lp ON lp.listing_id = l.id
      LEFT JOIN LATERAL (
        SELECT i.url
        FROM images i
        WHERE i.listing_id = l.id
        ORDER BY i.is_primary DESC, i.position ASC NULLS LAST
        LIMIT 1
      ) img ON TRUE
      ${whereSql}
      ORDER BY COALESCE(l.published_at, l.created_at) DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `;

    const result = await this.pool.query<ListingQueryRow>(sql, [...params, query.limit, query.offset]);
    const total = Number(result.rows[0]?.total_count ?? 0);
    const items = result.rows
      .map((row) => mapRow(row))
      .filter((item): item is ListingSummary => Boolean(item));
    return { items, total };
  }

  async listMine(
    authUserId: string,
    query: MyListingsQuery
  ): Promise<{ items: ListingSummary[]; total: number }> {
    const { whereSql, params } = buildWhereMine(authUserId, query);
    const limitParam = `$${params.length + 1}`;
    const offsetParam = `$${params.length + 2}`;

    const sql = `
      SELECT
        l.id, l.listing_type, l.title, l.description, l.price, l.currency, l.status,
        l.allow_financing, l.allow_exchange, l.is_featured, l.visibility,
        l.rent_daily_price, l.rent_weekly_price, l.rent_monthly_price, l.rent_security_deposit,
        l.auction_start_price, l.auction_start_at, l.auction_end_at,
        l.published_at, l.created_at, l.location, l.region_id, l.commune_id, l.user_id,
        l.metadata, l.tags,
        v.key AS vertical_key,
        c.name AS commune_name,
        r.name AS region_name,
        img.url AS image_url,
        lv.vehicle_type_id, vt.slug AS vehicle_type_key, vt.name AS vehicle_type_label,
        lv.brand_id, b.name AS brand_name, lv.model_id, m.name AS model_name,
        lv.year, lv.mileage, lv.body_type, lv.transmission, lv.fuel_type, lv.color, lv.condition,
        lp.property_type, lp.bedrooms, lp.bathrooms, lp.total_area, lp.built_area,
        lp.parking_spaces, lp.floor, lp.building_floors, lp.furnished, lp.pet_friendly,
        lp.features, lp.amenities,
        COUNT(*) OVER()::int AS total_count
      FROM listings l
      INNER JOIN verticals v ON v.id = l.vertical_id
      LEFT JOIN communes c ON c.id = l.commune_id
      LEFT JOIN regions r ON r.id = l.region_id
      LEFT JOIN listings_vehicles lv ON lv.listing_id = l.id
      LEFT JOIN vehicle_types vt ON vt.id = lv.vehicle_type_id
      LEFT JOIN brands b ON b.id = lv.brand_id
      LEFT JOIN models m ON m.id = lv.model_id
      LEFT JOIN listings_properties lp ON lp.listing_id = l.id
      LEFT JOIN LATERAL (
        SELECT i.url
        FROM images i
        WHERE i.listing_id = l.id
        ORDER BY i.is_primary DESC, i.position ASC NULLS LAST
        LIMIT 1
      ) img ON TRUE
      ${whereSql}
      ORDER BY l.created_at DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `;

    const result = await this.pool.query<ListingQueryRow>(sql, [...params, query.limit, query.offset]);
    const total = Number(result.rows[0]?.total_count ?? 0);
    const items = result.rows
      .map((row) => mapRow(row))
      .filter((item): item is ListingSummary => Boolean(item));
    return { items, total };
  }

  async findById(listingId: string): Promise<ListingSummary | null> {
    const sql = `
      SELECT
        l.id, l.listing_type, l.title, l.description, l.price, l.currency, l.status,
        l.allow_financing, l.allow_exchange, l.is_featured, l.visibility,
        l.rent_daily_price, l.rent_weekly_price, l.rent_monthly_price, l.rent_security_deposit,
        l.auction_start_price, l.auction_start_at, l.auction_end_at,
        l.published_at, l.created_at, l.location, l.region_id, l.commune_id, l.user_id,
        l.metadata, l.tags,
        v.key AS vertical_key,
        c.name AS commune_name,
        r.name AS region_name,
        img.url AS image_url,
        lv.vehicle_type_id, vt.slug AS vehicle_type_key, vt.name AS vehicle_type_label,
        lv.brand_id, b.name AS brand_name, lv.model_id, m.name AS model_name,
        lv.year, lv.mileage, lv.body_type, lv.transmission, lv.fuel_type, lv.color, lv.condition,
        lp.property_type, lp.bedrooms, lp.bathrooms, lp.total_area, lp.built_area,
        lp.parking_spaces, lp.floor, lp.building_floors, lp.furnished, lp.pet_friendly,
        lp.features, lp.amenities
      FROM listings l
      INNER JOIN verticals v ON v.id = l.vertical_id
      LEFT JOIN communes c ON c.id = l.commune_id
      LEFT JOIN regions r ON r.id = l.region_id
      LEFT JOIN listings_vehicles lv ON lv.listing_id = l.id
      LEFT JOIN vehicle_types vt ON vt.id = lv.vehicle_type_id
      LEFT JOIN brands b ON b.id = lv.brand_id
      LEFT JOIN models m ON m.id = lv.model_id
      LEFT JOIN listings_properties lp ON lp.listing_id = l.id
      LEFT JOIN LATERAL (
        SELECT i.url
        FROM images i
        WHERE i.listing_id = l.id
        ORDER BY i.is_primary DESC, i.position ASC NULLS LAST
        LIMIT 1
      ) img ON TRUE
      WHERE l.status = 'published' AND l.id = $1
      LIMIT 1
    `;

    const result = await this.pool.query<ListingQueryRow>(sql, [listingId]);
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]!) ?? null;
  }

  async listMedia(listingId: string): Promise<ListingMedia[]> {
    const sql = `
      SELECT id, listing_id, url, position
      FROM images
      WHERE listing_id = $1
      ORDER BY position ASC NULLS LAST, created_at ASC
    `;
    const result = await this.pool.query<{
      id: string;
      listing_id: string;
      url: string;
      position: number | null;
    }>(sql, [listingId]);

    return result.rows
      .map((row) =>
        ListingMediaSchema.safeParse({
          id: row.id,
          listingId: row.listing_id,
          url: row.url,
          kind: "image",
          order: Number(row.position ?? 0)
        })
      )
      .filter((parsed) => parsed.success)
      .map((parsed) => parsed.data);
  }

  async deleteOwnedListing(authUserId: string, listingId: string): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `DELETE FROM listings
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [listingId, authUserId]
    );
    return Boolean(result.rows[0]?.id);
  }

  async resolveAuthUserId(accessToken: string): Promise<string | null> {
    const token = String(accessToken || "").trim();
    if (!token) return null;
    if (UUID_REGEX.test(token)) return token;
    return decodeJwtSub(token);
  }

  private async resolveVerticalId(client: PoolClient, vertical: Vertical): Promise<string> {
    const candidates =
      vertical === "autos" ? ["vehicles", "autos"] : [VERTICAL_TO_DB[vertical]];
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM verticals WHERE key = ANY($1::text[]) ORDER BY key = $2 DESC LIMIT 1`,
      [candidates, candidates[0]]
    );
    const id = rows[0]?.id;
    if (!id) throw new Error(`Failed to resolve vertical id (${vertical})`);
    return id;
  }

  private async ensureOwnerPublicProfileId(
    client: PoolClient,
    authUserId: string
  ): Promise<string> {
    const active = await client.query<{ id: string }>(
      `SELECT id FROM public_profiles
       WHERE owner_profile_id = $1 AND status = 'active'
       LIMIT 1`,
      [authUserId]
    );
    if (active.rows[0]?.id) return active.rows[0].id;

    const draft = await client.query<{ id: string }>(
      `SELECT id FROM public_profiles
       WHERE owner_profile_id = $1 AND status = 'draft'
       LIMIT 1`,
      [authUserId]
    );
    if (draft.rows[0]?.id) return draft.rows[0].id;

    const created = await client.query<{ id: string }>(
      `INSERT INTO public_profiles (owner_profile_id, slug, status, is_public)
       VALUES ($1, $2, 'draft', false)
       RETURNING id`,
      [authUserId, `u-${authUserId}`]
    );
    const id = created.rows[0]?.id;
    if (!id) throw new Error("Failed to create public_profile");
    return id;
  }

  private async upsertDetailTable(
    client: PoolClient,
    table: "listings_vehicles" | "listings_properties",
    listingId: string,
    payload: Record<string, unknown>
  ) {
    const keys = Object.keys(payload);
    if (keys.length === 0) return;
    const columns = ["listing_id", ...keys];
    const values = [listingId, ...keys.map((key) => payload[key])];
    const placeholders = values.map((_, idx) => `$${idx + 1}`);
    const updates = keys.map((key) => `${key} = EXCLUDED.${key}`);

    await client.query(
      `INSERT INTO ${table} (${columns.join(", ")})
       VALUES (${placeholders.join(", ")})
       ON CONFLICT (listing_id) DO UPDATE SET ${updates.join(", ")}`,
      values
    );
  }

  private async replaceListingImages(
    client: PoolClient,
    listingId: string,
    images: UpsertListingInput["images"]
  ) {
    await client.query(`DELETE FROM images WHERE listing_id = $1`, [listingId]);
    if (!images.length) return;

    let index = 0;
    for (const image of images) {
      if (!image.url) continue;
      await client.query(
        `INSERT INTO images (listing_id, url, is_primary, position, alt_text)
         VALUES ($1, $2, $3, $4, NULL)`,
        [listingId, image.url, index === 0 || Boolean(image.is_primary), index]
      );
      index += 1;
    }
  }

  private async replaceListingDocuments(
    client: PoolClient,
    listingId: string,
    authUserId: string,
    documents: NonNullable<UpsertListingInput["documents"]>
  ) {
    await client.query(`DELETE FROM documents WHERE listing_id = $1`, [listingId]);

    const publicPaths: string[] = [];
    for (const doc of documents) {
      const path = extractDocumentPath(doc.path);
      if (!path) continue;
      await client.query(
        `INSERT INTO documents (listing_id, user_id, name, url, file_type, file_size, is_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          listingId,
          authUserId,
          doc.name,
          path,
          doc.type ?? null,
          typeof doc.size === "number" ? doc.size : null,
          Boolean(doc.is_public)
        ]
      );
      if (doc.is_public) publicPaths.push(path);
    }

    await client.query(`UPDATE listings SET document_urls = $2 WHERE id = $1`, [
      listingId,
      publicPaths
    ]);
  }

  private async ensureMetrics(client: PoolClient, listingId: string) {
    await client.query(
      `INSERT INTO listing_metrics (listing_id, views, clicks, favorites, shares)
       VALUES ($1, 0, 0, 0, 0)
       ON CONFLICT (listing_id) DO NOTHING`,
      [listingId]
    );
  }

  async upsertListing(input: UpsertListingInput): Promise<UpsertListingResult> {
    const client = await this.pool.connect();
    const now = new Date().toISOString();

    try {
      await client.query("BEGIN");
      const verticalId = await this.resolveVerticalId(client, input.vertical);
      const publicProfileId = await this.ensureOwnerPublicProfileId(client, input.authUserId);

      const safeListing = pickAllowed(input.listing, ALLOWED_LISTING_COLUMNS);
      const safeAutosDetail =
        input.vertical === "autos"
          ? pickAllowed(input.detail, ALLOWED_AUTO_DETAIL_COLUMNS)
          : {};
      const safePropertiesDetail =
        input.vertical === "properties"
          ? pickAllowed(input.detail, ALLOWED_PROPERTY_DETAIL_COLUMNS)
          : {};

      const nextStatus =
        typeof safeListing.status === "string" ? safeListing.status : "draft";

      const baseListing: Record<string, unknown> = {
        ...safeListing,
        user_id: input.authUserId,
        vertical_id: verticalId,
        public_profile_id: publicProfileId,
        updated_at: now,
        status: nextStatus
      };

      let listingId: string;
      let created = false;

      if (input.listingId) {
        const existing = await client.query<{ id: string; published_at: string | null }>(
          `SELECT id, published_at
           FROM listings
           WHERE id = $1 AND user_id = $2
           LIMIT 1`,
          [input.listingId, input.authUserId]
        );
        const row = existing.rows[0];
        if (!row?.id) {
          throw new Error("Listing not found or access denied");
        }

        const updatePayload: Record<string, unknown> = {
          ...baseListing,
          published_at: nextStatus === "published" ? row.published_at ?? now : null
        };
        const columns = Object.keys(updatePayload);
        const values = columns.map((column) => updatePayload[column]);
        const setters = columns.map((column, idx) => `${column} = $${idx + 1}`);
        await client.query(
          `UPDATE listings
           SET ${setters.join(", ")}
           WHERE id = $${columns.length + 1}`,
          [...values, input.listingId]
        );
        listingId = input.listingId;
      } else {
        created = true;
        const insertPayload: Record<string, unknown> = {
          ...baseListing,
          created_at: now,
          published_at: nextStatus === "published" ? now : null
        };
        const columns = Object.keys(insertPayload);
        const values = columns.map((column) => insertPayload[column]);
        const placeholders = columns.map((_, idx) => `$${idx + 1}`);
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO listings (${columns.join(", ")})
           VALUES (${placeholders.join(", ")})
           RETURNING id`,
          values
        );
        const id = inserted.rows[0]?.id;
        if (!id) throw new Error("Failed to create listing");
        listingId = id;
      }

      if (input.vertical === "autos") {
        await this.upsertDetailTable(client, "listings_vehicles", listingId, safeAutosDetail);
      } else if (input.vertical === "properties") {
        await this.upsertDetailTable(
          client,
          "listings_properties",
          listingId,
          safePropertiesDetail
        );
      }

      if (input.replaceImages) {
        await this.replaceListingImages(client, listingId, input.images);
      }

      if (input.documents) {
        await this.replaceListingDocuments(client, listingId, input.authUserId, input.documents);
      }

      await this.ensureMetrics(client, listingId);

      await client.query("COMMIT");
      return { id: listingId, created, updatedAt: now };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
