import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, loadProfileById, verifyLocalCredentials } from "@simple/auth/server";
import { setSessionCookie } from "@/lib/server/sessionCookie";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({} as Record<string, unknown>));
  if (!email || !password) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const credentials = await verifyLocalCredentials({
    email: String(email),
    password: String(password)
  });

  if (!credentials?.id) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const token = createSessionToken({
    sub: credentials.id,
    email: credentials.email
  });

  const profile = await loadProfileById(credentials.id);
  const user = {
    id: credentials.id,
    email: credentials.email,
    name:
      profile?.display_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      credentials.email
  };

  const response = NextResponse.json({
    ok: true,
    accessToken: token,
    user,
    profile: profile || null
  });

  setSessionCookie(response, token);
  return response;
}
