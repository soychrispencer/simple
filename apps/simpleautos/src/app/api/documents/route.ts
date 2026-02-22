import { NextRequest, NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/server/requireAuth";
import { getDbPool } from "@/lib/server/db";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireAuthUserId(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const listingId = String(req.nextUrl.searchParams.get("listing_id") || "").trim();
  if (!listingId) {
    return NextResponse.json({ error: "listing_id requerido" }, { status: 400 });
  }

  try {
    const db = getDbPool();
    const owned = await db.query(
      `SELECT id
       FROM listings
       WHERE id = $1
         AND user_id = $2
       LIMIT 1`,
      [listingId, auth.userId]
    );

    if (!owned.rows[0]) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const docs = await db.query(
      `SELECT id, listing_id, name, url, file_type, file_size, is_public, created_at
       FROM documents
       WHERE listing_id = $1
       ORDER BY created_at ASC`,
      [listingId]
    );

    return NextResponse.json({ documents: docs.rows || [] });
  } catch (error) {
    logError("[API /api/documents GET] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
