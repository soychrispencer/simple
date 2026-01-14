import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => (cookieStore as any) });
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return NextResponse.json({ ok: true }, { status: 200 });

    const admin = getAdminClient();
    await admin.from("integrations").delete().eq("user_id", user.id).eq("provider", "instagram");

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "disconnect failed" }, { status: 500 });
  }
}
