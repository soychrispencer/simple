import { API_BASE } from '@simple/config';

/**
 * Normaliza `users.avatar_url` para mostrarla en el cliente.
 * Convierte URLs absolutas de `/uploads/*` al mismo origen (vía rewrite en Next)
 * o las antepone con `API_BASE` cuando está definido.
 */
export function resolveAvatarDisplayUrl(raw: string | null | undefined): string | null {
    const value = raw?.trim();
    if (!value) return null;

    const prefix = API_BASE.replace(/\/+$/, '');

    if (/^https?:\/\//i.test(value)) {
        try {
            const parsed = new URL(value);
            if (parsed.pathname.startsWith('/uploads/')) {
                return `${prefix}${parsed.pathname}`;
            }
            if (parsed.pathname.startsWith('/api/')) {
                return `${prefix}${parsed.pathname}${parsed.search}`;
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
