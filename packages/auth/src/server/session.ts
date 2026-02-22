import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionTokenPayload {
  sub: string;
  email?: string | null;
  iat: number;
  exp: number;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(unsignedToken: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(unsignedToken)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function resolveSessionSecret(): string {
  const secret = String(process.env.AUTH_SESSION_SECRET || "").trim();
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-auth-session-secret-change-me";
  }
  throw new Error("AUTH_SESSION_SECRET no configurado");
}

export function createSessionToken(
  payload: Omit<SessionTokenPayload, "iat" | "exp"> & { expiresInSeconds?: number },
  secret = resolveSessionSecret()
): string {
  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = Math.max(60, Number(payload.expiresInSeconds || 60 * 60 * 24 * 30));
  const body: SessionTokenPayload = {
    sub: payload.sub,
    email: payload.email || null,
    iat: now,
    exp: now + expiresInSeconds
  };

  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const tokenPayload = toBase64Url(JSON.stringify(body));
  const unsigned = `${header}.${tokenPayload}`;
  const signature = sign(unsigned, secret);
  return `${unsigned}.${signature}`;
}

export function verifySessionToken(
  token: string,
  secret = resolveSessionSecret()
): { valid: true; payload: SessionTokenPayload } | { valid: false; reason: string } {
  const raw = String(token || "").trim();
  if (!raw) return { valid: false, reason: "missing_token" };
  const parts = raw.split(".");
  if (parts.length !== 3) return { valid: false, reason: "invalid_format" };

  const [headerPart, payloadPart, signaturePart] = parts;
  if (!headerPart || !payloadPart || !signaturePart) {
    return { valid: false, reason: "invalid_format" };
  }

  const unsigned = `${headerPart}.${payloadPart}`;
  const expected = sign(unsigned, secret);
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signaturePart);
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return { valid: false, reason: "invalid_signature" };
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadPart)) as SessionTokenPayload;
    if (!payload?.sub || !payload?.exp || !payload?.iat) {
      return { valid: false, reason: "invalid_payload" };
    }
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return { valid: false, reason: "expired" };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "invalid_payload" };
  }
}

export function parseCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const target = `${name}=`;
  const chunks = cookieHeader.split(";").map((item) => item.trim());
  for (const chunk of chunks) {
    if (!chunk.startsWith(target)) continue;
    return decodeURIComponent(chunk.slice(target.length));
  }
  return null;
}

