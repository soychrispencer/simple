import { NextResponse } from "next/server";
import { parseCookie } from "@simple/auth/server";

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

function resolveCookieName(): string {
  return String(process.env.SESSION_COOKIE_NAME || "sa_session").trim() || "sa_session";
}

function resolveCookieDomain(): string | undefined {
  const value = String(process.env.SESSION_COOKIE_DOMAIN || "").trim();
  return value || undefined;
}

function resolveCookieSameSite(): "lax" | "strict" | "none" {
  const value = String(process.env.SESSION_COOKIE_SAMESITE || "lax").trim().toLowerCase();
  if (value === "none" || value === "strict") return value;
  return "lax";
}

function resolveCookieSecure(): boolean {
  return toBoolean(process.env.SESSION_COOKIE_SECURE, process.env.NODE_ENV === "production");
}

function resolveTtlDays(): number {
  const parsed = Number(process.env.SESSION_TTL_DAYS || 30);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return Math.min(parsed, 90);
}

export function setSessionCookie(response: NextResponse, token: string): void {
  const maxAge = resolveTtlDays() * 24 * 60 * 60;
  response.cookies.set(resolveCookieName(), token, {
    httpOnly: true,
    secure: resolveCookieSecure(),
    sameSite: resolveCookieSameSite(),
    path: "/",
    maxAge,
    ...(resolveCookieDomain() ? { domain: resolveCookieDomain() } : {})
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(resolveCookieName(), "", {
    httpOnly: true,
    secure: resolveCookieSecure(),
    sameSite: resolveCookieSameSite(),
    path: "/",
    maxAge: 0,
    ...(resolveCookieDomain() ? { domain: resolveCookieDomain() } : {})
  });
}

export function resolveRequestToken(request: Request): string | null {
  const authHeader = String(request.headers.get("authorization") || "").trim();
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const cookieHeader = request.headers.get("cookie");
  return parseCookie(cookieHeader, resolveCookieName());
}
