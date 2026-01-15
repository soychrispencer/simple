import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { exchangeCodeForToken, exchangeForLongLivedToken, fetchPagesWithInstagram } from "@simple/instagram/server";

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

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectError = (reason: string) =>
    NextResponse.redirect(
      `${origin}/panel/configuraciones?error=instagram&reason=${encodeURIComponent(reason)}`
    );
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) return redirectError("missing_code");

    const cookieStore = await cookies();
    const expectedState = cookieStore.get("ig_oauth_state")?.value;
    const cookieUserId = cookieStore.get("ig_oauth_user")?.value;
    cookieStore.delete("ig_oauth_state");
    cookieStore.delete("ig_oauth_user");
    if (!expectedState || !state || expectedState !== state) {
      return redirectError("invalid_state");
    }

    // Preferimos el userId guardado al iniciar el OAuth (sirve cuando la sesión vive en localStorage).
    let userId: string | null = cookieUserId ? String(cookieUserId) : null;

    if (!userId) {
      const cookieStoreForSupabase = await cookies();
      const supabase = createRouteHandlerClient({ cookies: () => (cookieStoreForSupabase as any) });
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (user?.id) userId = user.id;
    }

    if (!userId) {
      console.error("instagram_oauth_callback: not_logged_in");
      return redirectError("not_logged_in");
    }

    const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET;
    const redirectOverride = process.env.INSTAGRAM_OAUTH_REDIRECT_URI;
    if (!appId || !appSecret) {
      return NextResponse.json(
        {
          error:
            "Credenciales Meta no configuradas (usa FACEBOOK_APP_ID/FACEBOOK_APP_SECRET o META_APP_ID/META_APP_SECRET)",
        },
        { status: 500 }
      );
    }

    const redirectUri = redirectOverride || `${origin}/api/instagram/oauth/callback`;

    let short;
    let long;
    try {
      short = await exchangeCodeForToken({ appId, appSecret, redirectUri, code });
      long = await exchangeForLongLivedToken({ appId, appSecret, shortLivedToken: short.access_token });
    } catch (e: any) {
      console.error("instagram_oauth_callback: token_exchange_failed", {
        message: e?.message || String(e),
      });
      return redirectError("token_exchange_failed");
    }

    const expiresAt = typeof long.expires_in === "number" ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null;

    let pages;
    try {
      pages = await fetchPagesWithInstagram({ accessToken: long.access_token });
    } catch (e: any) {
      console.error("instagram_oauth_callback: pages_fetch_failed", {
        message: e?.message || String(e),
      });
      return redirectError("pages_fetch_failed");
    }

    const first = pages[0] || null;
    if (!first?.igUserId) {
      return redirectError("no_instagram_account_linked");
    }

    let admin: SupabaseClient;
    try {
      admin = getAdminClient();
    } catch (e: any) {
      console.error("instagram_oauth_callback: supabase_admin_not_configured", {
        message: e?.message || String(e),
      });
      return redirectError("supabase_admin_not_configured");
    }
    const { data: integrationRow, error: integrationError } = await admin
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "instagram",
          status: "connected",
          connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      )
      .select("id")
      .single();

    if (integrationError || !integrationRow?.id) {
      console.error("instagram_oauth_callback: integration_upsert_failed", {
        message: integrationError?.message || "missing integration id",
      });
      return redirectError("integration_upsert_failed");
    }

    const { error: providerError } = await admin.from("integration_instagram").upsert(
      {
        integration_id: integrationRow.id,
        access_token: long.access_token,
        token_type: long.token_type || null,
        expires_at: expiresAt,
        page_id: first.pageId,
        page_name: first.pageName,
        ig_user_id: first.igUserId,
        ig_username: first.igUsername || null,
      },
      { onConflict: "integration_id" }
    );

    if (providerError) {
      console.error("instagram_oauth_callback: provider_upsert_failed", {
        message: providerError.message,
      });
      return redirectError("provider_upsert_failed");
    }

    return NextResponse.redirect(`${origin}/panel/configuraciones?connected=instagram`);
  } catch (e: any) {
    console.error("instagram_oauth_callback: unknown_error", { message: e?.message || String(e) });
    return redirectError("unknown_error");
  }
}
