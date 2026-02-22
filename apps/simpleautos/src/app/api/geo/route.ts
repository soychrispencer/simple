import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { logError } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = String(url.searchParams.get("mode") || "regions").trim().toLowerCase();
    const regionId = String(url.searchParams.get("region_id") || "").trim();

    const db = getDbPool();

    if (mode === "communes") {
      const result = regionId
        ? await db.query(
            `SELECT id, name, region_id, slug, active, sort_order
             FROM communes
             WHERE region_id = $1
             ORDER BY sort_order ASC NULLS LAST, name ASC`,
            [regionId]
          )
        : await db.query(
            `SELECT id, name, region_id, slug, active, sort_order
             FROM communes
             ORDER BY sort_order ASC NULLS LAST, name ASC`
          );

      return NextResponse.json({ communes: result.rows || [] });
    }

    const regions = await db.query(
      `SELECT id, name, code, slug, active, sort_order
       FROM regions
       ORDER BY sort_order ASC NULLS LAST, name ASC`
    );

    return NextResponse.json({ regions: regions.rows || [] });
  } catch (error) {
    logError("[API /api/geo GET autos] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
