import { NextRequest, NextResponse } from "next/server";
import { createLocalPasswordResetToken } from "@simple/auth/server";
import { EMAIL_DEBUG, PUBLIC_APP_URL } from "@/lib/config";
import { sendMail } from "@/lib/email";
import { logError } from "@/lib/logger";

function resolveBaseUrl(req: NextRequest): string {
  const explicit = String(PUBLIC_APP_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  try {
    return new URL(req.url).origin.replace(/\/+$/, "");
  } catch {
    return "http://localhost:3000";
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const email = String(body?.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
  }

  try {
    const generated = await createLocalPasswordResetToken({ email });
    if (!generated?.token || !generated?.profileId) {
      return NextResponse.json({ ok: true });
    }

    const resetUrl = `${resolveBaseUrl(req)}/reset?token=${encodeURIComponent(generated.token)}`;
    const mailResult = await sendMail({
      to: generated.email || email,
      subject: "Restablecer contrasena - SimpleAutos",
      text: `Para restablecer tu contrasena, abre este enlace: ${resetUrl}`,
      html: `<p>Para restablecer tu contrasena, abre este enlace:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    const debugEnabled = EMAIL_DEBUG || process.env.NODE_ENV !== "production" || !mailResult.ok;
    return NextResponse.json({
      ok: true,
      ...(debugEnabled ? { debugResetUrl: resetUrl } : {}),
    });
  } catch (error) {
    logError("[api/auth/forgot autos] error", error);
    return NextResponse.json({ error: "No se pudo procesar la solicitud" }, { status: 500 });
  }
}
