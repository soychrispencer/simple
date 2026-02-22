import type {
  AuthAdapter,
  AuthAdapterLoadProfileOptions,
  AuthSessionLike,
  AuthSignUpResponseLike,
  AuthUserLike,
  OAuthProvider
} from "../types/adapter";
import type { Profile } from "../types";

const ACCESS_TOKEN_KEY = "simple_access_token";

type MeResponse = {
  user?: AuthUserLike | null;
  profile?: Profile | null;
  accessToken?: string | null;
};

type Listener = (event: string, session: AuthSessionLike | null) => void;

const listeners = new Set<Listener>();

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(ACCESS_TOKEN_KEY);
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function writeAccessToken(token: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (!token) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      return;
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function emit(event: string, session: AuthSessionLike | null): void {
  for (const listener of listeners) {
    try {
      listener(event, session);
    } catch {
      // ignore listener errors
    }
  }
}

async function fetchJson<T = any>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const response = await fetch(path, {
      credentials: "include",
      cache: "no-store",
      ...init
    });
    const data = (await response.json().catch(() => null)) as T | null;
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

async function fetchSession(): Promise<{ session: AuthSessionLike | null; profile: Profile | null }> {
  const token = readAccessToken();
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetchJson<MeResponse>("/api/me", { method: "GET", headers });
  if (!response.ok || !response.data?.user?.id) {
    if (response.status === 401) {
      writeAccessToken(null);
    }
    return { session: null, profile: null };
  }

  const nextToken = String(response.data.accessToken || token || "").trim();
  if (nextToken) {
    writeAccessToken(nextToken);
  }

  return {
    session: {
      user: response.data.user,
      access_token: nextToken || undefined
    },
    profile: (response.data.profile || null) as Profile | null
  };
}

function normalizeSignUpData(data: AuthSignUpResponseLike | null | undefined): AuthSignUpResponseLike | undefined {
  if (!data) return undefined;
  return {
    user: data.user ?? null,
    session: data.session ?? null,
    identities: data.identities
  };
}

function asAuthError(error: unknown): { message: string } {
  if (error && typeof error === "object" && "message" in (error as any)) {
    return { message: String((error as any).message || "Error de autenticación") };
  }
  return { message: String(error || "Error de autenticación") };
}

export function createApiAuthAdapter(): AuthAdapter {
  return {
    kind: "api",
    rawClient: null,
    async getSession(): Promise<AuthSessionLike | null> {
      const { session } = await fetchSession();
      return session;
    },
    async refreshSession(): Promise<AuthSessionLike | null> {
      const { session } = await fetchSession();
      emit("TOKEN_REFRESHED", session);
      return session;
    },
    async getUser(): Promise<AuthUserLike | null> {
      const { session } = await fetchSession();
      return session?.user ?? null;
    },
    onAuthStateChange(callback) {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    async signInWithPassword(email: string, password: string) {
      const response = await fetchJson<{ error?: string; user?: AuthUserLike | null; accessToken?: string | null }>(
        "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        }
      );

      if (!response.ok) {
        return {
          error: asAuthError(response.data?.error || "No se pudo iniciar sesión")
        };
      }

      const token = String(response.data?.accessToken || "").trim();
      writeAccessToken(token || null);
      const session: AuthSessionLike = {
        user: (response.data?.user || { id: "" }) as AuthUserLike,
        access_token: token || undefined
      };
      emit("SIGNED_IN", session);
      return { error: null };
    },
    async signInWithOAuth(provider: OAuthProvider, _options?: { redirectTo?: string }) {
      if (provider !== "google") {
        return { error: asAuthError("Proveedor OAuth no soportado") };
      }
      return { error: asAuthError("OAuth Google no configurado en backend propio") };
    },
    async signUp(params) {
      const response = await fetchJson<{ error?: string; user?: AuthUserLike | null; profile?: Profile | null; accessToken?: string | null }>(
        "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params)
        }
      );

      if (!response.ok) {
        return {
          error: asAuthError(response.data?.error || "No se pudo crear la cuenta")
        };
      }

      const token = String(response.data?.accessToken || "").trim();
      writeAccessToken(token || null);

      const data: AuthSignUpResponseLike = {
        user: (response.data?.user || null) as AuthUserLike | null,
        session: response.data?.user
          ? {
              user: response.data.user as AuthUserLike,
              access_token: token || undefined
            }
          : null,
        identities: []
      };

      emit("SIGNED_IN", data.session ?? null);
      return { data: normalizeSignUpData(data), error: null };
    },
    async signOut() {
      await fetchJson("/api/auth/logout", { method: "POST" });
      writeAccessToken(null);
      emit("SIGNED_OUT", null);
    },
    async loadProfile(userId: string, _options: AuthAdapterLoadProfileOptions): Promise<Profile | null> {
      const { session, profile } = await fetchSession();
      if (!session?.user?.id || session.user.id !== userId) {
        return null;
      }
      return profile ?? null;
    }
  };
}

