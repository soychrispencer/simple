import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { logError } from "@/lib/logger";

type FeatureCatalogRow = {
  code: string;
  label: string;
  category: string | null;
  sort_order: number | null;
  active: boolean;
  allowed_types: string[] | null;
  allowed_body_types: string[] | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const typeSlug = String(url.searchParams.get("type_slug") || "").trim().toLowerCase();
    const bodyType = String(url.searchParams.get("body_type") || "").trim().toLowerCase();
    const includeInactive = String(url.searchParams.get("include_inactive") || "") === "true";

    if (!typeSlug) {
      return NextResponse.json({ features: [] });
    }

    const db = getDbPool();

    const rows = await db.query<FeatureCatalogRow>(
      `SELECT
         code,
         label,
         category,
         sort_order,
         COALESCE(active, true) AS active,
         allowed_types,
         allowed_body_types
       FROM features_catalog
       WHERE ($1::boolean OR COALESCE(active, true) = true)
         AND (
           allowed_types IS NULL
           OR cardinality(allowed_types) = 0
           OR $2 = ANY(allowed_types)
         )
       ORDER BY sort_order ASC NULLS LAST, code ASC`,
      [includeInactive, typeSlug]
    );

    const filtered = bodyType
      ? rows.rows.filter((row: FeatureCatalogRow) => {
          const allowed = Array.isArray(row.allowed_body_types) ? row.allowed_body_types : null;
          return !allowed || allowed.length === 0 || allowed.includes(bodyType);
        })
      : rows.rows;

    return NextResponse.json({ features: filtered });
  } catch (error: any) {
    const code = String(error?.code || "");
    if (code === "42P01") {
      return NextResponse.json({ features: [] });
    }

    logError("[API /api/features-catalog GET autos] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
