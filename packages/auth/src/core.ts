import { API_BASE } from '@simple/config';

export const AUTH_PASSWORD_MIN_LENGTH = 8;

export type AuthApiResponse<TUser = unknown> = {
  ok?: boolean;
  error?: string;
  user?: TUser;
};

export async function authRequest<TData = unknown>(
  path: string,
  init?: RequestInit
): Promise<{ status: number; data: TData | null }> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    });

    const data = (await response.json().catch(() => null)) as TData | null;
    return { status: response.status, data };
  } catch {
    return { status: 0, data: null };
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function getPasswordStrength(password: string): 'none' | 'low' | 'medium' | 'high' {
  if (!password) return 'none';
  let score = 0;
  if (password.length >= AUTH_PASSWORD_MIN_LENGTH) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return 'low';
  if (score <= 3) return 'medium';
  return 'high';
}

/**
 * Devuelve una ruta interna segura para redirigir tras el login, o `fallback`
 * si la entrada apunta a un destino externo. Evita open redirects:
 *  - Elimina espacios y caracteres de control (\t, \n, etc.) que los navegadores
 *    descartan al resolver URLs y que sirven para «contrabandear» destinos
 *    (p. ej. "/\t/evil.com" → "//evil.com").
 *  - Exige una ruta absoluta ("/...") y rechaza referencias de red
 *    protocol-relative ("//host") y sus variantes con backslash ("/\\host",
 *    "\\host"), que el navegador normaliza a un origen externo.
 */
export function resolveSafeInternalPath(path: string | null | undefined, fallback = '/'): string {
  if (!path) return fallback;
  const cleaned = path.replace(/[\u0000-\u001F\u007F\s]/g, '');
  if (!cleaned.startsWith('/')) return fallback;
  if (cleaned.length > 1 && (cleaned[1] === '/' || cleaned[1] === '\\')) return fallback;
  return cleaned;
}
