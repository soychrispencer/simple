import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { requireAuthUserId } from "@/lib/server/requireAuth";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

type PeriodFilter = "all" | "week" | "month" | "year";
type VehicleFilter = "all" | "car" | "motorcycle" | "truck";

type ListingStatRow = {
  id: string;
  title: string | null;
  price: number | null;
  status: string | null;
  published_at: string | null;
  created_at: string | null;
  metadata?: Record<string, any> | null;
  views: number;
  clicks: number;
  favorites: number;
  shares: number;
  vehicle_type_slug: string | null;
};

type ImageRow = {
  listing_id: string;
  url: string;
  position: number | null;
  is_primary: boolean | null;
};

const EMPTY_RESPONSE = {
  metrics: {
    views: 0,
    contacts: 0,
    favorites: 0,
    shares: 0,
    conversionRate: 0,
  },
  previousMetrics: {
    views: 0,
    contacts: 0,
    favorites: 0,
    shares: 0,
  },
  bars: [] as number[],
  barLabels: [] as string[],
  chartData: [] as number[],
  chartLabels: [] as string[],
  recentVehicles: [] as Array<Record<string, any>>,
};

function parsePeriod(value: string | null): PeriodFilter {
  const next = String(value || "").trim().toLowerCase();
  if (next === "week" || next === "month" || next === "year") return next;
  return "all";
}

function parseVehicleType(value: string | null): VehicleFilter {
  const next = String(value || "").trim().toLowerCase();
  if (next === "car" || next === "motorcycle" || next === "truck") return next;
  return "all";
}

function getPeriodStart(period: PeriodFilter): Date | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }
  return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
}

function getPreviousRange(period: PeriodFilter): { start: Date; end: Date } | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "week") {
    return {
      start: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      end: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    };
  }
  if (period === "month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 2, now.getDate()),
      end: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
    };
  }
  return {
    start: new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()),
    end: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
  };
}

function resolveListingDate(row: ListingStatRow): Date | null {
  const source = row.published_at || row.created_at;
  if (!source) return null;
  const parsed = new Date(source);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function matchesVehicleFilter(row: ListingStatRow, filter: VehicleFilter): boolean {
  if (filter === "all") return true;
  const slug = String(row.vehicle_type_slug || row.metadata?.type_key || "").trim().toLowerCase();
  if (!slug) return false;
  return slug === filter;
}

function aggregateMetrics(rows: ListingStatRow[]) {
  return rows.reduce(
    (acc, row) => {
      acc.views += Number(row.views || 0);
      acc.contacts += Number(row.clicks || 0);
      acc.favorites += Number(row.favorites || 0);
      acc.shares += Number(row.shares || 0);
      return acc;
    },
    { views: 0, contacts: 0, favorites: 0, shares: 0 }
  );
}

function inRange(date: Date | null, start: Date | null, endExclusive?: Date | null): boolean {
  if (!date) return false;
  if (start && date < start) return false;
  if (endExclusive && date >= endExclusive) return false;
  return true;
}

export async function GET(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const url = new URL(request.url);
    const period = parsePeriod(url.searchParams.get("period"));
    const vehicleType = parseVehicleType(url.searchParams.get("vehicleType"));

    const rawScopeColumn = String(url.searchParams.get("scopeColumn") || "").trim();
    const rawScopeValue = String(url.searchParams.get("scopeValue") || "").trim();
    const scopeColumn = rawScopeColumn === "public_profile_id" ? "public_profile_id" : "user_id";
    const scopeValue = scopeColumn === "user_id"
      ? auth.userId
      : rawScopeValue;

    if (!scopeValue) {
      return NextResponse.json(EMPTY_RESPONSE);
    }

    const db = getDbPool();
    const verticalResult = await db.query(
      `SELECT id
       FROM verticals
       WHERE key = ANY($1::text[])
       ORDER BY CASE WHEN key = 'vehicles' THEN 0 ELSE 1 END
       LIMIT 1`,
      [["vehicles", "autos"]]
    );
    const verticalId = verticalResult.rows[0]?.id;
    if (!verticalId) {
      return NextResponse.json(EMPTY_RESPONSE);
    }

    const listingsResult = await db.query(
      `SELECT
         l.id,
         l.title,
         l.price,
         l.status,
         l.published_at,
         l.created_at,
         l.metadata,
         COALESCE(lm.views, 0)::int AS views,
         COALESCE(lm.clicks, 0)::int AS clicks,
         COALESCE(lm.favorites, 0)::int AS favorites,
         COALESCE(lm.shares, 0)::int AS shares,
         vt.slug AS vehicle_type_slug
       FROM listings l
       LEFT JOIN listing_metrics lm ON lm.listing_id = l.id
       LEFT JOIN listings_vehicles lv ON lv.listing_id = l.id
       LEFT JOIN vehicle_types vt ON vt.id = lv.vehicle_type_id
       WHERE l.vertical_id = $1
         AND l.${scopeColumn} = $2
       ORDER BY COALESCE(l.published_at, l.created_at) DESC
       LIMIT 2000`,
      [verticalId, scopeValue]
    );

    const listings = (listingsResult.rows || []) as ListingStatRow[];
    if (!listings.length) {
      return NextResponse.json(EMPTY_RESPONSE);
    }

    const listingIds = listings.map((row) => String(row.id));
    const imagesResult = await db.query(
      `SELECT listing_id::text AS listing_id, url, position, is_primary
       FROM images
       WHERE listing_id::text = ANY($1::text[])
       ORDER BY listing_id, is_primary DESC, position ASC NULLS LAST`,
      [listingIds]
    );

    const imagesByListing = new Map<string, ImageRow[]>();
    for (const row of imagesResult.rows as ImageRow[]) {
      const key = String(row.listing_id);
      const bucket = imagesByListing.get(key) || [];
      bucket.push(row);
      imagesByListing.set(key, bucket);
    }

    const currentStart = getPeriodStart(period);
    const previousRange = getPreviousRange(period);

    const filteredCurrent = listings.filter((row) => {
      const date = resolveListingDate(row);
      return matchesVehicleFilter(row, vehicleType) && inRange(date, currentStart, null);
    });

    const previousRows = previousRange
      ? listings.filter((row) => {
          const date = resolveListingDate(row);
          return matchesVehicleFilter(row, vehicleType) && inRange(date, previousRange.start, previousRange.end);
        })
      : filteredCurrent;

    const currentAggregates = aggregateMetrics(filteredCurrent);
    const previousAggregates = aggregateMetrics(previousRows);

    const conversionRate = currentAggregates.views > 0
      ? (currentAggregates.contacts / currentAggregates.views) * 100
      : 0;

    const recentVehicles = filteredCurrent
      .map((row) => {
        const orderedImages = imagesByListing.get(String(row.id)) || [];
        return {
          id: row.id,
          title: row.title || "Sin título",
          published_at: row.published_at,
          price: row.price ?? 0,
          views: Number(row.views || 0),
          clicks: Number(row.clicks || 0),
          favorites: Number(row.favorites || 0),
          shares: Number(row.shares || 0),
          cover: orderedImages[0]?.url || null,
        };
      })
      .sort((a, b) => {
        const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
        const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
        return dateB - dateA;
      });

    const bars = recentVehicles.slice(0, 7).map((row) => Number(row.views || 0));
    const barLabels = recentVehicles.slice(0, 7).map((row) => row.title || "Sin título");

    const chartStart = new Date();
    chartStart.setDate(chartStart.getDate() - 13);
    const chartBuckets = new Map<string, number>();
    recentVehicles.forEach((vehicle) => {
      if (!vehicle.published_at) return;
      const publishedDate = new Date(vehicle.published_at);
      if (!Number.isFinite(publishedDate.getTime()) || publishedDate < chartStart) return;
      const key = publishedDate.toISOString().split("T")[0];
      chartBuckets.set(key, (chartBuckets.get(key) || 0) + Number(vehicle.views || 0));
    });

    const chartData: number[] = [];
    const chartLabels: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      chartData.push(chartBuckets.get(key) || 0);
      chartLabels.push(date.toLocaleDateString("es-ES", { month: "short", day: "numeric" }));
    }

    return NextResponse.json({
      metrics: {
        views: currentAggregates.views,
        contacts: currentAggregates.contacts,
        favorites: currentAggregates.favorites,
        shares: currentAggregates.shares,
        conversionRate,
      },
      previousMetrics: {
        views: previousAggregates.views,
        contacts: previousAggregates.contacts,
        favorites: previousAggregates.favorites,
        shares: previousAggregates.shares,
      },
      bars,
      barLabels,
      chartData,
      chartLabels,
      recentVehicles,
    });
  } catch (error) {
    logError("[API /api/vehicles/stats GET] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
