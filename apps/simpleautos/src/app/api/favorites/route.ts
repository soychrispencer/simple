import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { requireAuthUserId } from "@/lib/server/requireAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = requireAuthUserId(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT
         f.id,
         f.listing_id,
         json_build_object(
           'id', l.id,
           'title', l.title,
           'price', l.price,
           'metadata', l.metadata,
           'images', COALESCE((
             SELECT json_agg(json_build_object('url', i.url, 'position', i.position, 'is_primary', i.is_primary) ORDER BY i.position ASC NULLS LAST)
             FROM images i
             WHERE i.listing_id = l.id
           ), '[]'::json)
         ) AS listings
       FROM favorites f
       INNER JOIN listings l ON l.id = f.listing_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [auth.userId]
    );

    return NextResponse.json({ favorites: result.rows || [] });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "Error interno") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuthUserId(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const listingId = String(body.listingId || body.listing_id || "").trim();
  if (!listingId) {
    return NextResponse.json({ error: "listingId requerido" }, { status: 400 });
  }

  try {
    const db = getDbPool();
    const inserted = await db.query(
      `INSERT INTO favorites (user_id, listing_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, listing_id) DO NOTHING
       RETURNING id, listing_id`,
      [auth.userId, listingId]
    );

    if (!inserted.rows[0]) {
      return NextResponse.json({ ok: true, duplicated: true });
    }

    return NextResponse.json({ ok: true, favorite: inserted.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "Error interno") }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuthUserId(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const id = String(req.nextUrl.searchParams.get("id") || "").trim();
  const listingId = String(req.nextUrl.searchParams.get("listingId") || "").trim();

  if (!id && !listingId) {
    return NextResponse.json({ error: "id o listingId requerido" }, { status: 400 });
  }

  try {
    const db = getDbPool();
    if (id) {
      await db.query(`DELETE FROM favorites WHERE id = $1 AND user_id = $2`, [id, auth.userId]);
    } else {
      await db.query(`DELETE FROM favorites WHERE listing_id = $1 AND user_id = $2`, [listingId, auth.userId]);
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "Error interno") }, { status: 500 });
  }
}
