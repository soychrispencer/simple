function isR2PublicHost(hostname: string): boolean {
    return hostname.endsWith('.r2.dev') || hostname.endsWith('.r2.cloudflarestorage.com');
}

function isOptimizableMediaHost(hostname: string): boolean {
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return false;
    // Cloudflare Image Resizing aplica en zonas proxied (custom domain R2 / CDN).
    // r2.dev y el endpoint S3 no pasan por Image Resizing.
    if (isR2PublicHost(hostname)) return false;
    return true;
}

/** Base pública R2 (mismo bucket que producción). Override con NEXT_PUBLIC_MEDIA_BASE_URL. */
function getClientR2PublicBase(): string {
    const fromEnv = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MEDIA_BASE_URL : '')?.trim();
    if (fromEnv) return fromEnv.replace(/\/+$/, '');
    return 'https://pub-4809688bad1a41768578b221b0df942c.r2.dev';
}

/** Reescribe URLs legadas Backblaze B2 → R2 (mismos object keys). */
export function rewriteLegacyBackblazeMediaUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed || !/backblazeb2\.com/i.test(trimmed)) return trimmed;
    try {
        const parsed = new URL(trimmed);
        const match = parsed.pathname.match(/^\/file\/simple-media\/(.+)$/i);
        if (!match) return trimmed;
        return `${getClientR2PublicBase()}/${decodeURIComponent(match[1])}`;
    } catch {
        return trimmed;
    }
}

/**
 * Normaliza URLs de medios para mostrarlas en frontends Next con rewrite `/uploads/*`.
 * Las rutas locales siempre quedan same-origin (`/uploads/...`), sin apuntar al puerto de la API.
 * URLs de R2 u otros hosts externos (Google, etc.) se dejan absolutas.
 */
export function resolveAppMediaUrl(url: string | null | undefined): string | null {
    if (!url?.trim()) return null;

    const trimmed = rewriteLegacyBackblazeMediaUrl(url.trim());
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

export type OptimizeListingImageOptions = {
    /** Ancho máximo en CSS px (se multiplica por dpr en el edge). */
    width?: number;
    quality?: number;
    fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
};

/**
 * Variante liviana vía Cloudflare Image Resizing (`/cdn-cgi/image/...`).
 * Si la URL no es optimizable, devuelve el original.
 */
export function optimizeListingImageUrl(
    url: string | null | undefined,
    options: OptimizeListingImageOptions = {},
): string {
    const trimmed = rewriteLegacyBackblazeMediaUrl(url?.trim() ?? '');
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
    if (trimmed.includes('/cdn-cgi/image/')) return trimmed;

    const width = Math.max(64, Math.min(options.width ?? 720, 2400));
    const quality = Math.max(40, Math.min(options.quality ?? 72, 90));
    const fit = options.fit ?? 'scale-down';
    const transform = `width=${width},quality=${quality},fit=${fit},format=auto`;

    if (trimmed.startsWith('/uploads/')) {
        return `/cdn-cgi/image/${transform}${trimmed}`;
    }

    if (!/^https?:\/\//i.test(trimmed)) return trimmed;

    try {
        const parsed = new URL(trimmed);
        if (!isOptimizableMediaHost(parsed.hostname)) return trimmed;
        if (parsed.pathname.startsWith('/cdn-cgi/image/')) return trimmed;
        return `${parsed.origin}/cdn-cgi/image/${transform}${parsed.pathname}${parsed.search}`;
    } catch {
        return trimmed;
    }
}

/** Anchos recomendados por superficie. */
export const LISTING_IMAGE_WIDTHS = {
    card: 720,
    list: 400,
    detail: 1200,
    thumb: 240,
} as const;
