import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildMetaOAuthUrl } from "@simple/instagram/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function randomState() {
  return crypto.randomUUID();
}

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ? String(match[1]) : null;
}

async function getUserFromBearer(req: NextRequest) {
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
  return data?.user ?? null;
}

function buildRedirect(req: NextRequest, input: { appId: string; redirectUri: string; state: string }) {
  return buildMetaOAuthUrl({
    appId: input.appId,
    redirectUri: input.redirectUri,
    state: input.state,
    scopes: [
      "instagram_basic",
      "instagram_content_publish",
      "pages_show_list",
      "pages_read_engagement",
    ],
  });
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

  // 1) Cookie-session (si existe)
  const cookieStoreForSupabase = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => (cookieStoreForSupabase as any) });
  const { data: authData } = await supabase.auth.getUser();
  const authedUser = authData?.user || null;
  if (!authedUser) {
    // En SimpleAutos a veces la sesión vive en localStorage; para eso se usa POST.
    return NextResponse.redirect(`${origin}/login?next=/panel/configuraciones#integraciones`);
  }

  // Debug seguro: devuelve config pública (no incluye secretos) para verificar en producción.
  if (req.nextUrl.searchParams.get("debug") === "1") {
    return NextResponse.json({
      origin,
      client_id: appId,
      redirect_uri: redirectUri,
      scope: "instagram_basic instagram_content_publish pages_show_list pages_read_engagement",
      user: { id: authedUser.id, email: authedUser.email },
      note: "client_id debe ser el App ID principal de Meta (no el Instagram app id del caso de uso)",
    });
  }

  const url = buildRedirect(req, { appId, redirectUri, state });

  const res = NextResponse.redirect(url);
  res.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 60 * 10,
  });
  res.cookies.set("ig_oauth_user", authedUser.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}

export async function POST(req: NextRequest) {
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

  const user = await getUserFromBearer(req);
  if (!user) {
    return NextResponse.json({ error: "No auth" }, { status: 401 });
  }

  const state = randomState();
  const url = buildRedirect(req, { appId, redirectUri, state });

  const res = NextResponse.json({ url });
  res.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 60 * 10,
  });
  res.cookies.set("ig_oauth_user", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
