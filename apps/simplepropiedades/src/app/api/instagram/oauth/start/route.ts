import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { buildMetaOAuthUrl } from "@simple/instagram/server";

export const runtime = "nodejs";

function getRedirectUri(req: NextRequest) {
  const env = process.env.INSTAGRAM_OAUTH_REDIRECT_URI;
  if (env) return env;
  return new URL("/api/instagram/oauth/callback", req.nextUrl.origin).toString();
}

export async function GET(req: NextRequest) {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) return NextResponse.json({ error: "FACEBOOK_APP_ID not configured" }, { status: 500 });

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = getRedirectUri(req);

  const url = buildMetaOAuthUrl({
    appId,
    redirectUri,
    state,
    scopes: ["pages_show_list", "instagram_basic", "instagram_content_publish"],
  });

  const cookieStore = await cookies();
  cookieStore.set("ig_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(url);
}
