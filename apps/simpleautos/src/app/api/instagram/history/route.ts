import { NextRequest, NextResponse } from "next/server";
import { getInstagramPublishHistoryForUser, resolveAuthUserId } from "@simple/instagram/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveAuthUserId(req);
    if (!userId) return NextResponse.json({ items: [] }, { status: 200 });

    const vertical = req.nextUrl.searchParams.get("vertical") || "autos";
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") || 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

    const items = await getInstagramPublishHistoryForUser({
      userId,
      vertical,
      limit,
      processQueue: true,
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "history failed" }, { status: 500 });
  }
}

