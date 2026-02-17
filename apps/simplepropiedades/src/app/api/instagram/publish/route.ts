import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
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

function getSupabaseAdmin() {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    throw new Error("Supabase service role no configurado");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function materializePublicJpeg(input: {
  origin: string;
  sourceUrl: string;
  bucket: string;
}) {
  const absoluteSource = new URL(input.sourceUrl, input.origin);

  const sourceRes = await fetch(absoluteSource.toString(), { method: "GET", cache: "no-store" });
  if (!sourceRes.ok) {
    throw new Error(`No se pudo preparar imagen (HTTP ${sourceRes.status})`);
  }
  const contentType = String(sourceRes.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("image/")) {
    throw new Error("La URL de imagen no devolvió contenido de imagen");
  }

  const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer());
  const sharp = (await import("sharp")).default;
  const jpegBuffer = await sharp(sourceBuffer).jpeg({ quality: 90, mozjpeg: true }).toBuffer();

  const path = `instagram/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
  const supabase = getSupabaseAdmin();
  const upload = await supabase.storage.from(input.bucket).upload(path, jpegBuffer, {
    upsert: false,
    contentType: "image/jpeg",
    cacheControl: "3600",
  });
  if (upload.error || !upload.data?.path) {
    throw new Error(upload.error?.message || "No se pudo subir imagen pública para Instagram");
  }
  return supabase.storage.from(input.bucket).getPublicUrl(upload.data.path).data.publicUrl;
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
    const publishImageUrl =
      normalizedAbsolute.protocol === "https:" && !isLocalHost(normalizedAbsolute.hostname)
        ? normalizedAbsolute.toString()
        : await materializePublicJpeg({
            origin: req.nextUrl.origin,
            sourceUrl: normalizedAbsolute.toString(),
            bucket: String(process.env.INSTAGRAM_MEDIA_BUCKET || "properties"),
          });

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
