/**
 * Convierte URLs de medios servidas por la API a rutas same-origin (/uploads/...)
 * para que Next/Image y los rewrites del front funcionen en local y producción.
 */
export function resolveAppMediaUrl(url: string | null | undefined): string | null {
    if (!url?.trim()) return null;

    const trimmed = url.trim();
    if (trimmed.startsWith('/uploads/')) return trimmed;

    const uploadsPath = trimmed.match(/\/uploads\/[^\s?#]+/)?.[0];
    if (uploadsPath) return uploadsPath;

    return trimmed;
}
