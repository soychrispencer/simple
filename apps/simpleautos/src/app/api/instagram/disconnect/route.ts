import { NextRequest, NextResponse } from "next/server";
import { disconnectInstagram, resolveAuthUserId } from "@simple/instagram/server";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  try {
    const userId = await resolveAuthUserId(_req);
    if (!userId) return NextResponse.json({ ok: true }, { status: 200 });
    await disconnectInstagram(userId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "disconnect failed" }, { status: 500 });
  }
}
