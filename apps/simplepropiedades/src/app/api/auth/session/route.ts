import { NextRequest, NextResponse } from "next/server";
import { loadProfileById, verifySessionToken } from "@simple/auth/server";
import { setSessionCookie } from "@/lib/server/sessionCookie";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const accessToken = String(body?.accessToken || "").trim();

  if (!accessToken) {
    return NextResponse.json({ error: "accessToken requerido" }, { status: 400 });
  }

  const verified = verifySessionToken(accessToken);
  if (!verified.valid || !verified.payload?.sub) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const profile = await loadProfileById(verified.payload.sub);
  const response = NextResponse.json({
    ok: true,
    user: {
      id: verified.payload.sub,
      email: String(verified.payload.email || ""),
      name:
        profile?.display_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
        String(verified.payload.email || ""),
    },
    profile: profile || null,
    accessToken,
  });

  setSessionCookie(response, accessToken);
  return response;
}
