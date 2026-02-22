import { NextResponse } from "next/server";
import { deleteOwnedListing, listMyListings, upsertListing } from "@simple/sdk";
import { isSimpleApiListingsEnabled, isSimpleApiWriteEnabled } from "@simple/config";
import { logError } from "@/lib/logger";
import { resolveRequestToken } from "@/lib/server/sessionCookie";
import { verifySessionToken } from "@simple/auth/server";

type ScopeColumn = "user_id" | "public_profile_id";
type EditableStatus = "published" | "inactive" | "draft";

type PatchBody = {
  id?: unknown;
  status?: unknown;
  featured?: unknown;
};

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

function normalizeStatus(status: string | null | undefined): "published" | "inactive" | "draft" | "sold" {
  if (status === "published" || status === "inactive" || status === "draft" || status === "sold") {
    return status;
  }
  return "draft";
}

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const mode = String(url.searchParams.get("mode") || "").trim().toLowerCase();
    const scope = parseScope(url);
    const scopeFilter =
      scope?.column === "user_id" && scope.value !== auth.userId
        ? { column: "user_id" as const, value: auth.userId }
        : scope;

    if (mode === "subscription") {
      return NextResponse.json({
        status: "inactive",
        plan: null,
        planKey: null,
        renewalDate: null
      });
    }

    if (!isSimpleApiListingsEnabled()) {
      return NextResponse.json({ listings: [], count: 0 });
    }

    if (scopeFilter && scopeFilter.column !== "user_id") {
      return NextResponse.json({ listings: [], count: 0 });
    }

    const payload = await listMyListings({
      accessToken: auth.accessToken,
      vertical: "properties",
      limit: 200,
      offset: 0
    });

    const listings = (Array.isArray(payload.items) ? payload.items : []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description ?? null,
      listing_type: item.type === "rent" ? "rent" : "sale",
      price: item.price ?? 0,
      currency: item.currency ?? "CLP",
      status: normalizeStatus(item.status),
      published_at: item.publishedAt ?? null,
      created_at: item.createdAt ?? item.publishedAt ?? null,
      updated_at: item.createdAt ?? item.publishedAt ?? null,
      user_id: item.ownerId ?? auth.userId,
      is_featured: Boolean(item.featured),
      views: 0,
      listing_metrics: { views: 0, favorites: 0 },
      regions: item.region ? { name: item.region } : null,
      communes: item.city ? { name: item.city } : null,
      images: item.imageUrl
        ? [
            {
              url: item.imageUrl,
              position: 0,
              is_primary: true
            }
          ]
        : [],
      listings_properties: {
        property_type: item.propertyType ?? "house",
        operation_type: item.type === "rent" ? "rent" : "sale",
        bedrooms: item.bedrooms ?? null,
        bathrooms: item.bathrooms ?? null,
        parking_spaces: item.parkingSpaces ?? null,
        total_area: item.areaM2 ?? null,
        built_area: item.areaBuiltM2 ?? null,
        floor: item.floor ?? null,
        building_floors: item.totalFloors ?? null,
        furnished: item.isFurnished ?? null,
        pet_friendly: item.allowsPets ?? null,
        features: item.features ?? [],
        amenities: item.amenities ?? []
      }
    }));

    return NextResponse.json({ listings, count: Number(payload.meta?.total ?? listings.length) });
  } catch (error) {
    logError("[API /api/properties GET] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = requireAuth(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const listingId = String(url.searchParams.get("id") || "").trim();
    if (!listingId) {
      return NextResponse.json({ error: "ID de propiedad requerido" }, { status: 400 });
    }

    const response = await deleteOwnedListing({
      accessToken: auth.accessToken,
      listingId
    });

    if (!response.deleted) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Propiedad eliminada" });
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
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as PatchBody;
  const listingId = String(body?.id || "").trim();
  const hasStatus = typeof body?.status === "string";
  const hasFeatured = typeof body?.featured === "boolean";
  const nextStatus = String(body?.status || "").trim() as EditableStatus;
  const nextFeatured = hasFeatured ? Boolean(body.featured) : null;

  if (!listingId) {
    return NextResponse.json({ error: "ID de propiedad requerido" }, { status: 400 });
  }
  if (!hasStatus && !hasFeatured) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
  if (hasStatus && !["published", "inactive", "draft"].includes(nextStatus)) {
    return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
  }

  if (!isSimpleApiWriteEnabled()) {
    return NextResponse.json({ error: "Escrituras en simple-api deshabilitadas" }, { status: 409 });
  }

  try {
    const listing: Record<string, unknown> = {};
    if (hasStatus) listing.status = nextStatus;
    if (hasFeatured) listing.is_featured = nextFeatured;

    await upsertListing({
      accessToken: auth.accessToken,
      vertical: "properties",
      listingId,
      listing,
      replaceImages: false
    });

    return NextResponse.json({
      success: true,
      message: hasStatus ? "Estado actualizado" : "Destacado actualizado",
      id: listingId,
      status: hasStatus ? nextStatus : undefined,
      featured: hasFeatured ? nextFeatured : undefined
    });
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
