import { parseBooleanEnv, readPublicEnvValue } from "./runtime";

export type SimpleApiVertical = "autos" | "properties";
export type SimpleApiListingType = "sale" | "rent" | "auction";

export interface SimpleApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 1;
const FAILURE_COOLDOWN_MS = 15_000;

let apiFailureUntil = 0;

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function isLocalHost(value: string): boolean {
  const normalized = String(value || "").trim();
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function buildQueryString(query?: SimpleApiRequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

function shouldSkipByCooldown(now = Date.now()): boolean {
  return apiFailureUntil > now;
}

function markFailure(now = Date.now()): void {
  apiFailureUntil = now + FAILURE_COOLDOWN_MS;
}

function clearFailure(): void {
  apiFailureUntil = 0;
}

export function getSimpleApiBaseUrl(): string | null {
  const explicit = readPublicEnvValue("NEXT_PUBLIC_SIMPLE_API_BASE_URL");
  if (explicit) return normalizeBaseUrl(explicit);

  const win = (globalThis as any)?.window;
  if (win && win.location?.hostname === "localhost") {
    return "http://localhost:4000";
  }

  return null;
}

export function isSimpleApiListingsEnabled(): boolean {
  const raw = readPublicEnvValue("NEXT_PUBLIC_ENABLE_SIMPLE_API_LISTINGS");
  if (raw) return parseBooleanEnv(raw, false);

  const explicitBase = readPublicEnvValue("NEXT_PUBLIC_SIMPLE_API_BASE_URL");
  if (!explicitBase) return false;
  return !isLocalHost(explicitBase);
}

export function isSimpleApiWriteEnabled(): boolean {
  const raw = readPublicEnvValue("NEXT_PUBLIC_ENABLE_SIMPLE_API_WRITES");
  if (raw) return parseBooleanEnv(raw, false);

  const explicitBase = readPublicEnvValue("NEXT_PUBLIC_SIMPLE_API_BASE_URL");
  if (!explicitBase) return false;
  return !isLocalHost(explicitBase);
}

export function isSimpleApiStrictWriteEnabled(): boolean {
  const raw = readPublicEnvValue("NEXT_PUBLIC_SIMPLE_API_STRICT_WRITES");
  if (raw) return parseBooleanEnv(raw, false);
  return isSimpleApiWriteEnabled();
}

export async function requestSimpleApiJson<T>(
  path: string,
  options: SimpleApiRequestOptions = {}
): Promise<T> {
  const baseUrl = getSimpleApiBaseUrl();
  if (!baseUrl) {
    throw new Error("Simple API base URL no configurada. Define NEXT_PUBLIC_SIMPLE_API_BASE_URL.");
  }

  if (shouldSkipByCooldown()) {
    throw new Error("Simple API temporalmente en cooldown por fallos recientes.");
  }

  const retries = Number.isFinite(options.retries) ? Number(options.retries) : DEFAULT_RETRIES;
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? Number(options.timeoutMs)
    : DEFAULT_TIMEOUT_MS;

  const url = `${baseUrl}${path}${buildQueryString(options.query)}`;
  const method = options.method || "GET";

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          ...(options.headers || {})
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const hint = text ? ` body=${text.slice(0, 180)}` : "";
        throw new Error(`Simple API ${method} ${path} failed (${response.status}).${hint}`);
      }

      const payload = (await response.json()) as T;
      clearFailure();
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        markFailure();
        break;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Simple API request failed.");
}
