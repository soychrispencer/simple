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
  const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: "META app id not configured (use FACEBOOK_APP_ID or META_APP_ID)" },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = getRedirectUri(req);

  const scopes = ["pages_show_list", "instagram_basic", "instagram_content_publish"];

  if (req.nextUrl.searchParams.get("debug") === "1") {
    return NextResponse.json({
      origin: req.nextUrl.origin,
      client_id: appId,
      redirect_uri: redirectUri,
      scope: scopes.join(" "),
      note: "client_id must be the main Meta App ID (not the Instagram app id from the use case)",
    });
  }

  const url = buildMetaOAuthUrl({
    appId,
    redirectUri,
    state,
    scopes,
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
