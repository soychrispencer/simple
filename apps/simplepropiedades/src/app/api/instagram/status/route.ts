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

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => (cookieStore as any) });
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return NextResponse.json({ connected: false }, { status: 200 });

    const admin = getAdminClient();
    const { data: row, error } = await admin
      .from("integrations")
      .select("id, integration_instagram(ig_user_id, ig_username, page_name, expires_at)")
      .eq("user_id", user.id)
      .eq("provider", "instagram")
      .maybeSingle();

    if (error) return NextResponse.json({ connected: false }, { status: 200 });

    const provider = Array.isArray((row as any)?.integration_instagram)
      ? (row as any)?.integration_instagram?.[0]
      : (row as any)?.integration_instagram;
    const connected = !!provider?.ig_user_id;
    return NextResponse.json({
      connected,
      ig_user_id: provider?.ig_user_id || null,
      ig_username: provider?.ig_username || null,
      page_name: provider?.page_name || null,
      expires_at: provider?.expires_at || null,
    });
  } catch {
    return NextResponse.json({ connected: false }, { status: 200 });
  }
}
