import { NextResponse } from "next/server";
import { loadProfileById, verifySessionToken } from "@simple/auth/server";
import { resolveRequestToken } from "@/lib/server/sessionCookie";

export async function GET(request: Request) {
  const token = resolveRequestToken(request);
  if (!token) {
    return NextResponse.json({ user: null, profile: null }, { status: 401 });
  }

  const verified = verifySessionToken(token);
  if (!verified.valid || !verified.payload?.sub) {
    return NextResponse.json({ user: null, profile: null }, { status: 401 });
  }

  const profile = await loadProfileById(verified.payload.sub);
  const user = {
    id: verified.payload.sub,
    email: verified.payload.email || profile?.email || null,
    name:
      profile?.display_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      verified.payload.email ||
      null
  };

  return NextResponse.json({
    user,
    profile: profile || null,
    accessToken: token
  });
}
