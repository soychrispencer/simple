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
    const listingId = String(url.searchParams.get("listingId") || "").trim();
    const listingType = String(url.searchParams.get("listingType") || "").trim();

    if (!listingId) {
      return NextResponse.json({ error: "listingId requerido" }, { status: 400 });
    }

    const db = getDbPool();
    const slotsResult = await db.query(
      `SELECT bs.id, bs.key, bs.title, bs.description, bs.price, bs.currency, bs.placement, bs.max_active, bs.default_duration_days, bs.config
       FROM boost_slots bs
       INNER JOIN verticals v ON v.id = bs.vertical_id
       WHERE bs.is_active = true
         AND v.key = ANY($1::text[])
       ORDER BY bs.price DESC NULLS LAST, bs.created_at ASC NULLS LAST`,
      [["vehicles", "autos"]]
    );

    let slots = (slotsResult.rows || []).map((row: any) => ({
      id: String(row.id),
      key: String(row.key),
      title: String(row.title || ""),
      description: row.description ?? null,
      price: row.price == null ? null : Number(row.price),
      currency: row.currency ?? null,
      placement: row.placement ?? null,
      max_active: row.max_active == null ? null : Number(row.max_active),
      default_duration_days: row.default_duration_days == null ? null : Number(row.default_duration_days),
      config: row.config && typeof row.config === "object" ? row.config : {},
    }));

    if (listingType) {
      slots = slots.filter((slot: any) => {
        const allowed = Array.isArray(slot.config?.listing_types) ? slot.config.listing_types : null;
        if (!allowed || allowed.length === 0) return true;
        return allowed.includes(listingType);
      });
    }

    const listingResult = await db.query(
      `SELECT id, public_profile_id FROM listings WHERE id = $1 LIMIT 1`,
      [listingId]
    );
    const listing = listingResult.rows[0] || null;

    let hasPublicProfile = false;
    if (listing?.public_profile_id) {
      const ppResult = await db.query(
        `SELECT is_public, status FROM public_profiles WHERE id = $1 LIMIT 1`,
        [listing.public_profile_id]
      );
      hasPublicProfile = Boolean(ppResult.rows[0]?.is_public) && String(ppResult.rows[0]?.status || "") === "active";
    }

    const activeRows = await db.query(
      `SELECT slot_id::text AS slot_id, ends_at
       FROM listing_boost_slots
       WHERE listing_id = $1
         AND is_active = true`,
      [listingId]
    );

    const activeSlotIds: string[] = [];
    const activeSlotEndsAt: Record<string, string | null> = {};
    for (const row of activeRows.rows || []) {
      const slotId = String(row.slot_id || "");
      if (!slotId) continue;
      activeSlotIds.push(slotId);
      activeSlotEndsAt[slotId] = row.ends_at || null;
    }

    return NextResponse.json({
      slots,
      activeSlotIds,
      activeSlotEndsAt,
      hasPublicProfile,
    });
  } catch (error) {
    logError("[API /api/boosts/slots GET] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
