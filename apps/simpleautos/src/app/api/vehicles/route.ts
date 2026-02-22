import { NextResponse } from "next/server";
import {
  FREE_TIER_MAX_ACTIVE_LISTINGS,
  getMaxActiveListingsByPlan,
  normalizeSubscriptionPlanId,
  isSimpleApiListingsEnabled,
  isSimpleApiWriteEnabled
} from "@simple/config";
import { deleteOwnedListing, listMyListings, upsertListing } from "@simple/sdk";
import { logError, logWarn } from "@/lib/logger";
import { getDbPool } from "@/lib/server/db";
import { resolveRequestToken } from "@/lib/server/sessionCookie";
import { verifySessionToken } from "@simple/auth/server";

type ScopeColumn = "user_id" | "public_profile_id";

function parseScope(url: URL): { column: ScopeColumn; value: string } | null {
  const rawColumn = url.searchParams.get("scopeColumn");
  const rawValue = url.searchParams.get("scopeValue");
  if (!rawColumn || !rawValue) return null;
  if (rawColumn !== "user_id" && rawColumn !== "public_profile_id") return null;
  return { column: rawColumn, value: rawValue };
}

function requireAuth(request: Request): { userId: string; accessToken: string } | { error: string } {
  const token = resolveRequestToken(request);
  if (!token) return { error: "No autenticado" };
  const verified = verifySessionToken(token);
  if (!verified.valid || !verified.payload?.sub) return { error: "No autenticado" };
  return { userId: verified.payload.sub, accessToken: token };
}

function mapVehicle(item: any) {
  return {
    id: item.id,
    title: item.title,
    price: item.price,
    currency: item.currency ?? "CLP",
    year: item.year ?? null,
    mileage: item.mileage ?? null,
    fuel: item.fuelType ?? null,
    transmission: item.transmission ?? null,
    condition: item.condition ?? null,
    commune: item.city ?? null,
    region: item.region ?? null,
    status: item.status || "draft",
    listing_type: item.type || "sale",
    created_at: item.createdAt || item.publishedAt || null,
    updated_at: item.createdAt || item.publishedAt || null,
    type_slug: item.typeKey || null,
    type_label: item.typeLabel || null,
    views: 0,
    clicks: 0,
    rent_daily_price: item.rentDailyPrice ?? null,
    rent_weekly_price: item.rentWeeklyPrice ?? null,
    rent_monthly_price: item.rentMonthlyPrice ?? null,
    rent_price_period: item.rentPricePeriod ?? null,
    auction_start_price: item.auctionStartPrice ?? null,
    auction_start_at: item.auctionStartAt ?? null,
    auction_end_at: item.auctionEndAt ?? null,
    featured: Boolean(item.featured),
    specs: {},
    images: item.imageUrl
      ? [
          {
            id: `img-${item.id}-0`,
            url: item.imageUrl,
            is_cover: true,
            position: 0
          }
        ]
      : []
  };
}

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const url = new URL(request.url);
    const mode = String(url.searchParams.get("mode") || "").trim().toLowerCase();
    const scope = parseScope(url);
    const scopeFilter =
      scope?.column === "user_id" && scope.value !== auth.userId
        ? { column: "user_id" as const, value: auth.userId }
        : scope;

    if (mode === "subscription") {
      const db = getDbPool();
      const subscription = await db.query(
        `SELECT s.status, s.current_period_end, sp.name, sp.plan_key
         FROM subscriptions s
         INNER JOIN verticals v ON v.id = s.vertical_id
         LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
         WHERE s.user_id = $1
           AND s.status = 'active'
           AND v.key = ANY($2::text[])
         ORDER BY s.updated_at DESC NULLS LAST
         LIMIT 1`,
        [auth.userId, ["vehicles", "autos"]]
      );

      const row = subscription.rows[0] as any;
      return NextResponse.json({
        status: row?.status || "inactive",
        plan: row?.name || null,
        planKey: row?.plan_key || null,
        renewalDate: row?.current_period_end || null
      });
    }

    if (mode === "payments") {
      const rawLimit = Number(url.searchParams.get("limit") || 20);
      const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;
      const db = getDbPool();
      const result = await db.query(
        `SELECT id, created_at, amount, status, description
         FROM payments
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [auth.userId, limit]
      );

      return NextResponse.json({ invoices: result.rows || [] });
    }

    if (mode === "limits") {
      const fallback = {
        maxActiveListings: FREE_TIER_MAX_ACTIVE_LISTINGS,
        maxTotalListings: 1,
        activePublishedCount: 0,
        totalListingsCount: 0
      };

      if (!scopeFilter) return NextResponse.json(fallback);

      try {
        const db = getDbPool();
        const vertical = await db.query(
          `SELECT id FROM verticals WHERE key = ANY($1::text[]) ORDER BY key = $2 DESC LIMIT 1`,
          [["vehicles", "autos"], "vehicles"]
        );
        const verticalId = vertical.rows[0]?.id;
        if (!verticalId) return NextResponse.json(fallback);

        let planKey = "free";
        if (scopeFilter.column === "user_id") {
          const plan = await db.query(
            `SELECT sp.plan_key
             FROM subscriptions s
             LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
             WHERE s.user_id = $1 AND s.vertical_id = $2 AND s.status = 'active'
             ORDER BY s.updated_at DESC NULLS LAST
             LIMIT 1`,
            [auth.userId, verticalId]
          );
          planKey = normalizeSubscriptionPlanId(plan.rows[0]?.plan_key || "free");
        }

        const maxActiveListings = getMaxActiveListingsByPlan(planKey);
        const maxTotalListings = Math.max(maxActiveListings, 1);

        const published = await db.query(
          `SELECT COUNT(*)::int AS count
           FROM listings
           WHERE vertical_id = $1
             AND status = 'published'
             AND ${scopeFilter.column} = $2`,
          [verticalId, scopeFilter.value]
        );

        const total = await db.query(
          `SELECT COUNT(*)::int AS count
           FROM listings
           WHERE vertical_id = $1
             AND ${scopeFilter.column} = $2`,
          [verticalId, scopeFilter.value]
        );

        return NextResponse.json({
          maxActiveListings,
          maxTotalListings,
          activePublishedCount: Number(published.rows[0]?.count || 0),
          totalListingsCount: Number(total.rows[0]?.count || 0)
        });
      } catch (error) {
        logError("[API /api/vehicles GET limits] Unexpected error", error);
        return NextResponse.json(fallback);
      }
    }

    if (!isSimpleApiListingsEnabled()) {
      return NextResponse.json({ vehicles: [], count: 0 });
    }

    const payload = await listMyListings({
      accessToken: auth.accessToken,
      vertical: "autos",
      limit: 200,
      offset: 0
    });

    const vehicles = (Array.isArray(payload.items) ? payload.items : []).map(mapVehicle);
    return NextResponse.json({ vehicles, count: Number(payload.meta?.total ?? vehicles.length) });
  } catch (error: any) {
    logError("[API /api/vehicles GET] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = requireAuth(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const url = new URL(request.url);
  const vehicleId = String(url.searchParams.get("id") || "").trim();
  if (!vehicleId) {
    return NextResponse.json({ error: "ID de vehículo requerido" }, { status: 400 });
  }

  try {
    const response = await deleteOwnedListing({
      accessToken: auth.accessToken,
      listingId: vehicleId
    });

    if (!response.deleted) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Vehículo eliminado" });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message.includes("(404)")) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ error: message || "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = requireAuth(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const vehicleId = String(body?.id || "").trim();
  const nextStatus = String(body?.status || "").trim();

  if (!vehicleId) {
    return NextResponse.json({ error: "ID de vehículo requerido" }, { status: 400 });
  }
  if (!["published", "inactive", "draft"].includes(nextStatus)) {
    return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
  }

  if (!isSimpleApiWriteEnabled()) {
    return NextResponse.json({ error: "Escrituras en simple-api deshabilitadas" }, { status: 409 });
  }

  try {
    await upsertListing({
      accessToken: auth.accessToken,
      vertical: "autos",
      listingId: vehicleId,
      listing: { status: nextStatus },
      replaceImages: false
    });

    return NextResponse.json({ success: true, message: "Estado actualizado", id: vehicleId, status: nextStatus });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "Error interno") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const action = String(body?.action || "").trim();
  if (action !== "duplicate") {
    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  }

  return NextResponse.json(
    { error: "Duplicar publicación migrará a simple-api en siguiente iteración" },
    { status: 501 }
  );
}

export async function PUT() {
  return NextResponse.json({ error: "Use el formulario de edición" }, { status: 501 });
}
