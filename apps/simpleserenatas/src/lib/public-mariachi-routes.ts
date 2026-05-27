/** Segmentos de ruta reservados (no son slugs de mariachi). */
export const RESERVED_PUBLIC_SLUGS = new Set([
    'panel',
    'auth',
    'api',
    'uploads',
    'registrar-mariachis',
    'registrar-grupo',
    'crear-mariachis',
    'para-duenos',
    'mariachis',
    '_next',
    'favicon.ico',
    'robots.txt',
    'sitemap.xml',
    'manifest.webmanifest',
]);

export function isReservedPublicSlug(slug: string): boolean {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return true;
    return RESERVED_PUBLIC_SLUGS.has(normalized);
}

/** Misma lógica que `slugify` en la API (vista previa antes de guardar). */
export function previewSlugFromName(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 150) || 'grupo';
}

export function publicMariachiPath(slug: string): string {
    return `/${encodeURIComponent(slug)}`;
}

export function publicMariachiProfileUrl(slug: string, origin?: string): string {
    const base = (origin ?? (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
    if (!base) return publicMariachiPath(slug);
    return `${base}${publicMariachiPath(slug)}`;
}
