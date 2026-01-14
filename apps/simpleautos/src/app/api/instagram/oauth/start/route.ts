import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildMetaOAuthUrl } from "@simple/instagram/server";

export const runtime = "nodejs";

function randomState() {
  return crypto.randomUUID();
}

export async function GET(req: NextRequest) {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectOverride = process.env.INSTAGRAM_OAUTH_REDIRECT_URI;

  if (!appId) {
    return NextResponse.json({ error: "FACEBOOK_APP_ID no configurado" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const redirectUri = redirectOverride || `${origin}/api/instagram/oauth/callback`;
  const state = randomState();

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
    scopes: [
      "instagram_basic",
      "instagram_content_publish",
      "pages_show_list",
      "pages_read_engagement",
    ],
  });

  return NextResponse.redirect(url);
}
