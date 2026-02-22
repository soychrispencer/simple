import { NextRequest, NextResponse } from "next/server";
import {
  getInstagramFlowReason,
  publishInstagramForUser,
  resolveAuthUserId,
} from "@simple/instagram/server";

export const runtime = "nodejs";

type Body = {
  imageUrl: string;
  caption: string;
  listingId?: string;
  vertical?: string;
};

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveAuthUserId(req);
    if (!userId) return NextResponse.json({ error: "No auth" }, { status: 401 });

    const body = (await req.json()) as Partial<Body>;
    const imageUrl = String(body.imageUrl || "").trim();
    const caption = String(body.caption || "");
    if (!imageUrl || !caption) return NextResponse.json({ error: "Missing imageUrl/caption" }, { status: 400 });

    const normalizedImageUrl = imageUrl.includes("/api/instagram/media")
      ? imageUrl
      : `/api/instagram/media?src=${encodeURIComponent(imageUrl)}`;
    const normalizedAbsolute = new URL(normalizedImageUrl, req.nextUrl.origin);
    if (normalizedAbsolute.protocol !== "https:" || isLocalHost(normalizedAbsolute.hostname)) {
      throw new Error(
        "Instagram requiere imagen pública HTTPS. Usa dominio público (prod/túnel) para publicar."
      );
    }
    const publishImageUrl = normalizedAbsolute.toString();

    const result = await publishInstagramForUser({
      userId,
      origin: req.nextUrl.origin,
      imageUrl: publishImageUrl,
      caption,
      listingId: body.listingId ? String(body.listingId) : undefined,
      vertical: body.vertical ? String(body.vertical) : undefined,
    });

    const httpStatus =
      result.status === "failed" ? 500 : result.status === "retrying" || result.status === "queued" ? 202 : 200;
    return NextResponse.json(result, { status: httpStatus });
  } catch (e: any) {
    const reason = getInstagramFlowReason(e);
    const status = reason === "instagram_not_connected" ? 400 : 500;
    return NextResponse.json({ error: e?.message || "publish failed", reason }, { status });
  }
}
