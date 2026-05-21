import { API_BASE } from '@simple/config';

function isR2PublicHost(hostname: string): boolean {
    return hostname.endsWith('.r2.dev') || hostname.endsWith('.r2.cloudflarestorage.com');
}

/**
 * Normaliza `users.avatar_url` para mostrarla en el cliente.
 * URLs de R2 se dejan absolutas; rutas `/uploads/*` locales usan same-origin o API_BASE.
 */
export function resolveAvatarDisplayUrl(raw: string | null | undefined): string | null {
    const value = raw?.trim();
    if (!value) return null;

    const prefix = API_BASE.replace(/\/+$/, '');

    if (/^https?:\/\//i.test(value)) {
        try {
            const parsed = new URL(value);
            if (isR2PublicHost(parsed.hostname)) {
                return value;
            }
            if (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/api/')) {
                return prefix
                    ? `${prefix}${parsed.pathname}${parsed.search}`
                    : `${parsed.pathname}${parsed.search}`;
            }
            return value;
        } catch {
            return value;
        }
    }

    if (value.startsWith('/uploads/') || value.startsWith('/api/')) {
        return `${prefix}${value}`;
    }

    return value;
}
