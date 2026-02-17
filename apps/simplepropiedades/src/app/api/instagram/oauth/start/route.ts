import { NextRequest, NextResponse } from "next/server";
import {
  buildInstagramOAuthUrl,
  createInstagramOAuthState,
  resolveAuthUserId,
  setInstagramOAuthCookies,
} from "@simple/instagram/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const userId = await resolveAuthUserId(req);
  if (!userId) {
    return NextResponse.redirect(`${origin}/login?next=/panel/configuraciones#integraciones`);
  }

  try {
    const state = createInstagramOAuthState();
    await setInstagramOAuthCookies({ state, userId, origin });
    const url = buildInstagramOAuthUrl(origin, state);
    return NextResponse.redirect(url);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "No se pudo iniciar OAuth" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await resolveAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No auth" }, { status: 401 });
  }

  try {
    const origin = req.nextUrl.origin;
    const state = createInstagramOAuthState();
    await setInstagramOAuthCookies({ state, userId, origin });
    const url = buildInstagramOAuthUrl(origin, state);
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "No se pudo iniciar OAuth" }, { status: 500 });
  }
}
