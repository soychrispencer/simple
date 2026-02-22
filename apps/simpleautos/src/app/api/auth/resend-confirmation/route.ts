import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Verificación por correo deshabilitada en auth local."
  });
}
