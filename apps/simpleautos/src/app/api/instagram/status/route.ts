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

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ? String(match[1]) : null;
}

async function getAuthedUserId(req: NextRequest): Promise<string | null> {
  // 1) Cookie-based auth
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => (cookieStore as any) });
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
  } catch {
    // ignore
  }

  // 2) Bearer token (session en localStorage)
  const token = getBearerToken(req);
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const bearerClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-simpleautos-auth": "1" } },
  });
  const { data } = await bearerClient.auth.getUser(token);
  return data?.user?.id ?? null;
}

export async function GET(_req: NextRequest) {
  try {
    const userId = await getAuthedUserId(_req);
    if (!userId) return NextResponse.json({ connected: false }, { status: 200 });

    const admin = getAdminClient();
    const { data: row, error } = await admin
      .from("integrations")
      .select("id, integration_instagram(ig_user_id, ig_username, page_name, expires_at)")
      .eq("user_id", userId)
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
