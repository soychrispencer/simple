function isR2PublicHost(hostname: string): boolean {
    return hostname.endsWith('.r2.dev') || hostname.endsWith('.r2.cloudflarestorage.com');
}

/**
 * Normaliza URLs de medios para mostrarlas en frontends Next con rewrite `/uploads/*`.
 * Las rutas locales siempre quedan same-origin (`/uploads/...`), sin apuntar al puerto de la API.
 * URLs de R2 u otros hosts externos (Google, etc.) se dejan absolutas.
 */
export function resolveAppMediaUrl(url: string | null | undefined): string | null {
    if (!url?.trim()) return null;

    const trimmed = url.trim();
    if (trimmed.startsWith('/uploads/')) return trimmed;

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            if (isR2PublicHost(parsed.hostname)) {
                return trimmed;
            }
            if (parsed.pathname.startsWith('/uploads/')) {
                return `${parsed.pathname}${parsed.search}`;
            }
            return trimmed;
        } catch {
            return trimmed;
        }
    }

    const uploadsPath = trimmed.match(/\/uploads\/[^\s?#]+/)?.[0];
    if (uploadsPath) return uploadsPath;

    return trimmed;
}

/** Alias semántico: foto personal de Mi cuenta (no logo del perfil público). */
export const resolveAccountAvatarUrl = resolveAppMediaUrl;
