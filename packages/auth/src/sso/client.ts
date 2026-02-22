type SSOVerticalAccess = {
  vertical: "autos" | "propiedades" | "tiendas" | "food" | "crm";
  permissions: Record<string, unknown>;
  active: boolean;
};

type ValidateSSOTokenResponse = {
  valid: boolean;
  reason?: string;
  userId?: string;
  targetDomain?: string;
  expiresAt?: number;
  session?: {
    accessToken: string;
    refreshToken?: string;
  };
};

const DEFAULT_SSO_VERTICALS: SSOVerticalAccess[] = [
  { vertical: "autos", permissions: {}, active: true },
  { vertical: "propiedades", permissions: {}, active: true },
  { vertical: "tiendas", permissions: {}, active: true },
  { vertical: "food", permissions: {}, active: true },
  { vertical: "crm", permissions: {}, active: true }
];

function normalizeBaseUrl(url: string): string {
  return String(url || "").trim().replace(/\/+$/, "");
}

function resolveSimpleApiBaseUrl(): string {
  const explicit = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_SIMPLE_API_BASE_URL || process.env.SIMPLE_API_BASE_URL || ""
  );
  if (explicit) return explicit;

  const win = (globalThis as any)?.window;
  if (win && win.location?.hostname === "localhost") {
    return "http://localhost:4000";
  }

  throw new Error(
    "Simple API base URL no configurada para SSO. Define NEXT_PUBLIC_SIMPLE_API_BASE_URL."
  );
}

async function requestSimpleApi<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    authToken?: string;
  } = {}
): Promise<T> {
  const baseUrl = resolveSimpleApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(options.authToken
        ? {
            authorization: `Bearer ${options.authToken}`
          }
        : {})
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`SSO API ${path} failed (${response.status}) ${text.slice(0, 180)}`.trim());
  }
  return (await response.json()) as T;
}

/**
 * Compatibilidad legacy. Ya no existe cliente backend legado para SSO.
 */
export function getSSOClient(): null {
  return null;
}

// Utilidades para SSO entre verticales
export const ssoUtils = {
  async generateCrossDomainToken(
    authToken: string,
    targetDomain: string,
    expiresIn = 300,
    refreshToken?: string
  ) {
    const token = String(authToken || "").trim();
    if (!token) {
      throw new Error("auth access token is required to generate an SSO token");
    }
    if (!targetDomain) {
      throw new Error("targetDomain is required to generate an SSO token");
    }

    const payload = await requestSimpleApi<{ token: string; expiresIn: number }>("/v1/sso/token", {
      method: "POST",
      authToken: token,
      body: {
        targetDomain,
        expiresIn,
        ...(refreshToken ? { refreshToken } : {})
      }
    });

    if (!payload?.token) {
      throw new Error("SSO token payload is empty");
    }
    return payload.token;
  },

  async validateSSOToken(token: string, domain?: string): Promise<ValidateSSOTokenResponse> {
    return await requestSimpleApi<ValidateSSOTokenResponse>("/v1/sso/validate", {
      method: "POST",
      body: {
        token,
        ...(domain ? { domain } : {})
      }
    });
  },

  async getAvailableVerticals(authToken: string): Promise<SSOVerticalAccess[]> {
    const token = String(authToken || "").trim();
    if (!token) {
      return [];
    }

    try {
      const payload = await requestSimpleApi<{ items?: SSOVerticalAccess[] }>("/v1/sso/verticals", {
        method: "POST",
        authToken: token
      });
      const items = Array.isArray(payload?.items) ? payload.items : [];
      return items.length > 0 ? items : [];
    } catch {
      return [];
    }
  }
};

