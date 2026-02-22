import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

function uniqueOwnerIds(values: string[]): string[] {
  const set = new Set<string>();
  for (const value of values) {
    const id = String(value || "").trim();
    if (!id) continue;
    set.add(id);
    if (set.size >= 500) break;
  }
  return Array.from(set);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const raw = String(url.searchParams.get("owner_ids") || "").trim();
    if (!raw) {
      return NextResponse.json({ profiles: [] });
    }

    const ownerIds = uniqueOwnerIds(raw.split(","));
    if (!ownerIds.length) {
      return NextResponse.json({ profiles: [] });
    }

    const db = getDbPool();
    const result = await db.query(
      `SELECT DISTINCT ON (owner_profile_id)
         owner_profile_id,
         slug,
         public_name,
         avatar_url,
         status,
         created_at
       FROM public_profiles
       WHERE owner_profile_id::text = ANY($1::text[])
       ORDER BY owner_profile_id,
         CASE WHEN status = 'active' THEN 0 ELSE 1 END,
         created_at DESC`,
      [ownerIds]
    );

    return NextResponse.json({ profiles: result.rows || [] });
  } catch (error) {
    logError("[API /api/public-profiles GET] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
