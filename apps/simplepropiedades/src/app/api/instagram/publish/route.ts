import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publishImageToInstagram } from "@simple/instagram/server";

export const runtime = "nodejs";

type Body = {
  imageUrl: string;
  caption: string;
};

let adminClient: SupabaseClient | null = null;
function getAdminClient() {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase service credentials not configured");
    adminClient = createClient(url, key);
  }
  return adminClient;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => (cookieStore as any) });
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

    const body = (await req.json()) as Partial<Body>;
    const imageUrl = String(body.imageUrl || "");
    const caption = String(body.caption || "");
    if (!imageUrl || !caption) return NextResponse.json({ error: "Missing imageUrl/caption" }, { status: 400 });

    const origin = req.nextUrl.origin;
    const absoluteImageUrl = new URL(imageUrl, origin).toString();

    const admin = getAdminClient();
    const { data: row, error } = await admin
      .from("integrations")
      .select("id, integration_instagram(access_token, ig_user_id)")
      .eq("user_id", user.id)
      .eq("provider", "instagram")
      .maybeSingle();

    const provider = Array.isArray((row as any)?.integration_instagram)
      ? (row as any)?.integration_instagram?.[0]
      : (row as any)?.integration_instagram;

    if (error || !provider?.access_token || !provider?.ig_user_id) {
      return NextResponse.json({ error: "Instagram no conectado" }, { status: 400 });
    }

    const result = await publishImageToInstagram({
      igUserId: String(provider.ig_user_id),
      accessToken: String(provider.access_token),
      imageUrl: absoluteImageUrl,
      caption,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "publish failed" }, { status: 500 });
  }
}
