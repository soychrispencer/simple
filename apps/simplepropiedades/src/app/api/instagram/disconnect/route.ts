import { NextRequest, NextResponse } from "next/server";
import { disconnectInstagram, resolveAuthUserId } from "@simple/instagram/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveAuthUserId(req);
    if (!userId) return NextResponse.json({ ok: true }, { status: 200 });
    await disconnectInstagram(userId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "disconnect failed" }, { status: 500 });
  }
}
