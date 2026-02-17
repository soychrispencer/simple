import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_SOURCE_PATHS = ["/api/instagram/card"];

function isAllowedSourcePath(pathname: string) {
  return ALLOWED_SOURCE_PATHS.some((prefix) => pathname.startsWith(prefix));
}

function isAllowedExternalSource(sourceUrl: URL) {
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  if (!supabaseUrl) return false;
  try {
    const supabaseOrigin = new URL(supabaseUrl).origin;
    return (
      sourceUrl.origin === supabaseOrigin &&
      sourceUrl.pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const src = String(req.nextUrl.searchParams.get("src") || "").trim();
    if (!src) {
      return NextResponse.json({ error: "Missing src" }, { status: 400 });
    }

    const sourceUrl = new URL(src, req.nextUrl.origin);
    const isSameOriginCard =
      sourceUrl.origin === req.nextUrl.origin && isAllowedSourcePath(sourceUrl.pathname);
    const isAllowedSupabase = isAllowedExternalSource(sourceUrl);
    if (!isSameOriginCard && !isAllowedSupabase) {
      return NextResponse.json({ error: "Invalid src" }, { status: 400 });
    }

    const sourceRes = await fetch(sourceUrl.toString(), { method: "GET", cache: "no-store" });
    if (!sourceRes.ok) {
      return NextResponse.json({ error: `Source fetch failed (HTTP ${sourceRes.status})` }, { status: 502 });
    }

    const contentType = String(sourceRes.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Source is not an image" }, { status: 400 });
    }

    const buffer = Buffer.from(await sourceRes.arrayBuffer());
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(buffer).jpeg({ quality: 90, mozjpeg: true }).toBuffer();

    return new NextResponse(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Content-Length": String(jpeg.length),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to render media" }, { status: 500 });
  }
}
