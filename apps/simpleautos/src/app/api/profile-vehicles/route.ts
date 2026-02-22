import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { logError } from "@/lib/logger";

type ProfileVehicleRow = Record<string, unknown> & { total: number };

function toPositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const publicProfileId = String(url.searchParams.get("public_profile_id") || "").trim();
    const userId = String(url.searchParams.get("user_id") || "").trim();
    const page = toPositiveInt(url.searchParams.get("page"), 1, 10_000);
    const pageSize = toPositiveInt(url.searchParams.get("page_size"), 24, 100);

    if (!publicProfileId && !userId) {
      return NextResponse.json({ items: [], total: 0 });
    }

    const offset = (page - 1) * pageSize;
    const db = getDbPool();

    const scopedWhere = publicProfileId
      ? "l.public_profile_id = $1"
      : "l.user_id = $1";
    const scopeValue = publicProfileId || userId;

    const result = await db.query<ProfileVehicleRow>(
      `
      WITH filtered AS (
        SELECT l.*
        FROM listings l
        WHERE ${scopedWhere}
          AND l.status = 'published'
          AND coalesce(l.visibility, 'normal') <> 'hidden'
        ORDER BY l.created_at DESC
        LIMIT $2 OFFSET $3
      ),
      total_count AS (
        SELECT count(*)::int AS total
        FROM listings l
        WHERE ${scopedWhere}
          AND l.status = 'published'
          AND coalesce(l.visibility, 'normal') <> 'hidden'
      )
      SELECT
        f.id,
        f.title,
        f.listing_type,
        f.status,
        f.price,
        f.currency,
        f.user_id,
        f.public_profile_id,
        f.region_id,
        f.commune_id,
        f.visibility,
        f.contact_email,
        f.contact_phone,
        f.contact_whatsapp,
        f.allow_financing,
        f.allow_exchange,
        f.created_at,
        f.metadata,
        f.rent_daily_price,
        f.rent_weekly_price,
        f.rent_monthly_price,
        f.rent_security_deposit,
        f.auction_start_price,
        f.auction_start_at,
        f.auction_end_at,
        json_build_object(
          'vehicle_type_id', lv.vehicle_type_id,
          'year', lv.year,
          'mileage', lv.mileage,
          'transmission', lv.transmission,
          'fuel_type', lv.fuel_type,
          'condition', lv.condition,
          'brand_id', lv.brand_id,
          'model_id', lv.model_id,
          'brands', json_build_object('name', b.name),
          'models', json_build_object(
            'name', m.name,
            'vehicle_types', json_build_object('category', vt.category)
          )
        ) AS listings_vehicles,
        json_build_object('name', r.name) AS regions,
        json_build_object('name', c.name) AS communes,
        coalesce(
          json_agg(
            json_build_object(
              'url', i.url,
              'position', i.position,
              'is_primary', i.is_primary
            )
            ORDER BY i.is_primary DESC, i.position ASC
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'::json
        ) AS images,
        tc.total
      FROM filtered f
      LEFT JOIN listings_vehicles lv ON lv.listing_id = f.id
      LEFT JOIN brands b ON b.id = lv.brand_id
      LEFT JOIN models m ON m.id = lv.model_id
      LEFT JOIN vehicle_types vt ON vt.id = m.vehicle_type_id
      LEFT JOIN regions r ON r.id = f.region_id
      LEFT JOIN communes c ON c.id = f.commune_id
      LEFT JOIN images i ON i.listing_id = f.id
      CROSS JOIN total_count tc
      GROUP BY
        f.id,
        lv.vehicle_type_id, lv.year, lv.mileage, lv.transmission, lv.fuel_type, lv.condition, lv.brand_id, lv.model_id,
        b.name, m.name, vt.category,
        r.name, c.name,
        tc.total
      ORDER BY f.created_at DESC
      `,
      publicProfileId
        ? [scopeValue, pageSize, offset]
        : [scopeValue, pageSize, offset]
    );

    const rows = result.rows || [];
    const total = Number(rows[0]?.total ?? 0);
    const items = rows.map((row: ProfileVehicleRow) => {
      const { total: _total, ...next } = row;
      return next;
    });

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    logError("[API /api/profile-vehicles GET autos] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
