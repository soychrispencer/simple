import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { requireAuthUserId } from "@/lib/server/requireAuth";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = String(url.searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

    const db = getDbPool();
    const result = await db.query(
      `SELECT
         l.*,
         json_build_object(
           'id', lv.id,
           'listing_id', lv.listing_id,
           'vehicle_type_id', lv.vehicle_type_id,
           'brand_id', lv.brand_id,
           'model_id', lv.model_id,
           'year', lv.year,
           'mileage', lv.mileage,
           'transmission', lv.transmission,
           'fuel_type', lv.fuel_type,
           'condition', lv.condition,
           'state', lv.state,
           'color', lv.color,
           'vehicle_types', CASE WHEN vt.id IS NULL THEN NULL ELSE json_build_object('name', vt.name, 'slug', vt.slug, 'category', vt.category) END
         ) AS listings_vehicles
       FROM listings l
       LEFT JOIN listings_vehicles lv ON lv.listing_id = l.id
       LEFT JOIN vehicle_types vt ON vt.id = lv.vehicle_type_id
       WHERE l.id = $1
         AND l.user_id = $2
       LIMIT 1`,
      [id, auth.userId]
    );

    const listing = result.rows[0] || null;
    if (!listing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ listing });
  } catch (error) {
    logError("[API /api/vehicles/edit GET] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
