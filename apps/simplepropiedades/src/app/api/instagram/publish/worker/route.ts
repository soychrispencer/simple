import { NextRequest, NextResponse } from "next/server";
import { getInstagramFlowReason, processInstagramPublishQueueWorker } from "@simple/instagram/server";

export const runtime = "nodejs";

function resolveSecret(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch?.[1]) return bearerMatch[1];

  const headerSecret = req.headers.get("x-instagram-worker-secret");
  if (headerSecret) return headerSecret;

  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret) return querySecret;

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") || 25);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 25;
    const summary = await processInstagramPublishQueueWorker({
      secret: resolveSecret(req),
      limit,
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e: any) {
    const reason = getInstagramFlowReason(e);
    const status = reason === "worker_unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, reason, error: e?.message || "worker failed" }, { status });
  }
}

