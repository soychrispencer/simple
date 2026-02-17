import { NextRequest, NextResponse } from "next/server";
import { getInstagramConnection, processDueInstagramPublishJobs, resolveAuthUserId } from "@simple/instagram/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveAuthUserId(req);
    if (!userId) return NextResponse.json({ connected: false }, { status: 200 });
    await processDueInstagramPublishJobs({ userId, limit: 3 });
    return NextResponse.json(await getInstagramConnection(userId));
  } catch {
    return NextResponse.json({ connected: false }, { status: 200 });
  }
}
