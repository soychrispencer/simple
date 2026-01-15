import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildMetaOAuthUrl } from "@simple/instagram/server";

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
