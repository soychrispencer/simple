import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildMetaOAuthUrl } from "@simple/instagram/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

function randomState() {
  return crypto.randomUUID();
}

export async function GET(req: NextRequest) {
  const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;
  const redirectOverride = process.env.INSTAGRAM_OAUTH_REDIRECT_URI;

  if (!appId) {
    return NextResponse.json(
      { error: "META app id no configurado (usa FACEBOOK_APP_ID o META_APP_ID)" },
      { status: 500 }
    );
  }

  const origin = req.nextUrl.origin;

  // Debe existir sesión en SimpleAutos para poder asociar la integración a un usuario.
  const cookieStoreForSupabase = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => (cookieStoreForSupabase as any) });
  const { data: authData } = await supabase.auth.getUser();
  const authedUser = authData?.user || null;
  if (!authedUser) {
    return NextResponse.redirect(`${origin}/login?next=/panel/configuraciones#integraciones`);
  }

  const redirectUri = redirectOverride || `${origin}/api/instagram/oauth/callback`;
  const state = randomState();

  const scopes = [
    "instagram_basic",
    "instagram_content_publish",
    "pages_show_list",
    "pages_read_engagement",
  ];

  // Debug seguro: devuelve config pública (no incluye secretos) para verificar en producción.
  if (req.nextUrl.searchParams.get("debug") === "1") {
    return NextResponse.json({
      origin,
      client_id: appId,
      redirect_uri: redirectUri,
      scope: scopes.join(" "),
      user: { id: authedUser.id, email: authedUser.email },
      note: "client_id debe ser el App ID principal de Meta (no el Instagram app id del caso de uso)",
    });
  }

  const cookieStore = await cookies();
  cookieStore.set("ig_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 60 * 10,
  });

  const url = buildMetaOAuthUrl({
    appId,
    redirectUri,
    state,
    scopes,
  });

  return NextResponse.redirect(url);
}
