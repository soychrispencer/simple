import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, loadProfileById, registerLocalUser } from "@simple/auth/server";
import { setSessionCookie } from "@/lib/server/sessionCookie";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const firstName = String(body.nombre || body.firstName || body.name || "").trim();
  const lastName = String(body.apellido || body.lastName || "").trim();

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  try {
    const user = await registerLocalUser({
      email,
      password,
      firstName,
      lastName
    });

    const token = createSessionToken({
      sub: user.id,
      email: user.email
    });

    const profile = await loadProfileById(user.id);
    const response = NextResponse.json({
      ok: true,
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name:
          profile?.display_name ||
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
          user.email
      },
      profile: profile || null
    });

    setSessionCookie(response, token);
    return response;
  } catch (error: any) {
    const message = String(error?.message || "Error al crear usuario");
    if (message.includes("EMAIL_ALREADY_EXISTS")) {
      return NextResponse.json(
        { error: "Este correo ya está registrado. Intenta iniciar sesión." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
