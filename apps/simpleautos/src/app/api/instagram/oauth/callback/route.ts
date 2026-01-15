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
  const redirectError = () => NextResponse.redirect(`${origin}/panel/configuraciones?error=instagram`);
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) return redirectError();

    const cookieStore = await cookies();
    const expectedState = cookieStore.get("ig_oauth_state")?.value;
    cookieStore.delete("ig_oauth_state");
    if (!expectedState || !state || expectedState !== state) {
      return redirectError();
    }

    const cookieStoreForSupabase = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => (cookieStoreForSupabase as any) });
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return redirectError();

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

    const short = await exchangeCodeForToken({ appId, appSecret, redirectUri, code });
    const long = await exchangeForLongLivedToken({ appId, appSecret, shortLivedToken: short.access_token });

    const expiresAt = typeof long.expires_in === "number" ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null;

    const pages = await fetchPagesWithInstagram({ accessToken: long.access_token });
    const first = pages[0] || null;

    const admin = getAdminClient();
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
      return redirectError();
    }

    const { error: providerError } = await admin.from("integration_instagram").upsert(
      {
        integration_id: integrationRow.id,
        access_token: long.access_token,
        token_type: long.token_type || null,
        expires_at: expiresAt,
        page_id: first?.pageId || null,
        page_name: first?.pageName || null,
        ig_user_id: first?.igUserId || null,
        ig_username: first?.igUsername || null,
      },
      { onConflict: "integration_id" }
    );

    if (providerError) return redirectError();

    return NextResponse.redirect(`${origin}/panel/configuraciones?connected=instagram`);
  } catch (e: any) {
    return redirectError();
  }
}
