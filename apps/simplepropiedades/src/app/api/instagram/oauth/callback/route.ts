import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchPagesWithInstagram,
} from "@simple/instagram/server";

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

function getRedirectUri(req: NextRequest) {
  const env = process.env.INSTAGRAM_OAUTH_REDIRECT_URI;
  if (env) return env;
  return new URL("/api/instagram/oauth/callback", req.nextUrl.origin).toString();
}

export async function GET(req: NextRequest) {
  try {
    const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      return NextResponse.redirect(new URL("/panel/configuraciones?error=instagram", req.nextUrl.origin));
    }

    const cookieStore = await cookies();
    const expectedState = cookieStore.get("ig_oauth_state")?.value || "";
    const state = req.nextUrl.searchParams.get("state") || "";
    const code = req.nextUrl.searchParams.get("code") || "";
    if (!expectedState || !state || expectedState !== state || !code) {
      return NextResponse.redirect(new URL("/panel/configuraciones?error=instagram", req.nextUrl.origin));
    }

    const supabase = createRouteHandlerClient({ cookies: () => (cookieStore as any) });
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) {
      console.error("instagram_oauth_callback: not_logged_in");
      return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
    }

    const redirectUri = getRedirectUri(req);
    const short = await exchangeCodeForToken({
      appId,
      appSecret,
      redirectUri,
      code,
    });

    const long = await exchangeForLongLivedToken({
      appId,
      appSecret,
      shortLivedToken: short.access_token,
    });

    const pages = await fetchPagesWithInstagram({ accessToken: long.access_token });
    const first = pages[0];
    if (!first?.igUserId) throw new Error("No Instagram account found on your Facebook Pages");

    const admin = getAdminClient();
    const expiresAt = long.expires_in ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null;

    const { data: integrationRow, error: integrationError } = await admin
      .from("integrations")
      .upsert(
        {
          user_id: user.id,
          provider: "instagram",
          status: "connected",
          connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      )
      .select("id")
      .single();

    if (integrationError || !integrationRow?.id) {
      throw integrationError || new Error("Failed to upsert integration");
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
        ig_username: first.igUsername ?? null,
      },
      { onConflict: "integration_id" }
    );

    if (providerError) throw providerError;

    cookieStore.set("ig_oauth_state", "", { path: "/", maxAge: 0 });
    return NextResponse.redirect(new URL("/panel/configuraciones?connected=instagram", req.nextUrl.origin));
  } catch {
    return NextResponse.redirect(new URL("/panel/configuraciones?error=instagram", req.nextUrl.origin));
  }
}
