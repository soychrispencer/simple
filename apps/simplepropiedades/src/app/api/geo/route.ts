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
            `SELECT id, name, region_id
             FROM communes
             WHERE region_id = $1
             ORDER BY name ASC`,
            [regionId]
          )
        : await db.query(`SELECT id, name, region_id FROM communes ORDER BY name ASC`);

      return NextResponse.json({ communes: result.rows || [] });
    }

    const regions = await db.query(`SELECT id, name FROM regions ORDER BY name ASC`);
    return NextResponse.json({ regions: regions.rows || [] });
  } catch (error) {
    logError("[API /api/geo GET properties] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
