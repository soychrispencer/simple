import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { logError } from "@/lib/logger";

function normalizeTypeKey(raw: string | null): string {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = String(url.searchParams.get("mode") || "types")
      .trim()
      .toLowerCase();
    const typeKey = normalizeTypeKey(url.searchParams.get("type_key"));
    const brandId = String(url.searchParams.get("brand_id") || "").trim();

    const db = getDbPool();

    if (mode === "brands") {
      if (typeKey) {
        const result = await db.query(
          `SELECT DISTINCT b.id, b.name
           FROM models m
           INNER JOIN brands b ON b.id = m.brand_id
           INNER JOIN vehicle_types vt ON vt.id = m.vehicle_type_id
           WHERE lower(coalesce(vt.category, '')) = $1
              OR lower(coalesce(vt.slug, '')) = $1
           ORDER BY b.name ASC`,
          [typeKey]
        );
        return NextResponse.json({ brands: result.rows || [] });
      }

      const result = await db.query(
        `SELECT id, name
         FROM brands
         ORDER BY name ASC`
      );
      return NextResponse.json({ brands: result.rows || [] });
    }

    if (mode === "models") {
      if (brandId && typeKey) {
        const result = await db.query(
          `SELECT m.id, m.name, m.brand_id
           FROM models m
           INNER JOIN vehicle_types vt ON vt.id = m.vehicle_type_id
           WHERE m.brand_id = $1
             AND (
               lower(coalesce(vt.category, '')) = $2
               OR lower(coalesce(vt.slug, '')) = $2
             )
           ORDER BY m.name ASC`,
          [brandId, typeKey]
        );
        return NextResponse.json({ models: result.rows || [] });
      }

      if (brandId) {
        const result = await db.query(
          `SELECT id, name, brand_id
           FROM models
           WHERE brand_id = $1
           ORDER BY name ASC`,
          [brandId]
        );
        return NextResponse.json({ models: result.rows || [] });
      }

      if (typeKey) {
        const result = await db.query(
          `SELECT m.id, m.name, m.brand_id
           FROM models m
           INNER JOIN vehicle_types vt ON vt.id = m.vehicle_type_id
           WHERE lower(coalesce(vt.category, '')) = $1
              OR lower(coalesce(vt.slug, '')) = $1
           ORDER BY m.name ASC`,
          [typeKey]
        );
        return NextResponse.json({ models: result.rows || [] });
      }

      const result = await db.query(
        `SELECT id, name, brand_id
         FROM models
         ORDER BY name ASC`,
      );
      return NextResponse.json({ models: result.rows || [] });
    }

    const types = await db.query(
      `SELECT id, name, slug, category, sort_order, created_at
       FROM vehicle_types
       ORDER BY sort_order ASC NULLS LAST, name ASC`
    );

    return NextResponse.json({ types: types.rows || [] });
  } catch (error) {
    logError("[API /api/vehicle-catalog GET autos] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
