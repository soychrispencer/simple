import { verifySessionToken } from "@simple/auth/server";
import { resolveRequestToken } from "@/lib/server/sessionCookie";

export function requireAuthUserId(request: Request): { userId: string } | { error: string } {
  const token = resolveRequestToken(request);
  if (!token) return { error: "No autenticado" };
  const verified = verifySessionToken(token);
  if (!verified.valid || !verified.payload?.sub) {
    return { error: "No autenticado" };
  }
  return { userId: verified.payload.sub };
}
