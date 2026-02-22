import { NextRequest, NextResponse } from "next/server";
import { consumeLocalPasswordResetToken, updateLocalUserPassword } from "@simple/auth/server";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const token = String(body?.token || "").trim();
  const password = String(body?.password || "");

  if (!token || !password) {
    return NextResponse.json({ error: "Token y contrasena requeridos" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contrasena debe tener al menos 8 caracteres" }, { status: 400 });
  }

  try {
    const consumed = await consumeLocalPasswordResetToken(token);
    if (!consumed?.profileId) {
      return NextResponse.json({ error: "Token invalido o expirado" }, { status: 400 });
    }

    await updateLocalUserPassword({ profileId: consumed.profileId, password });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    logError("[api/auth/reset props] error", error);
    const message = String(error?.message || "");
    if (message.includes("INVALID_PASSWORD_RESET_PAYLOAD")) {
      return NextResponse.json({ error: "Datos de reseteo invalidos" }, { status: 400 });
    }
    if (message.includes("USER_NOT_FOUND")) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "No se pudo restablecer la contrasena" }, { status: 500 });
  }
}
