import { isProduction } from '../../env.js';
import { asObject, asString } from '../shared/helpers.js';

function getR2PublicHostname(): string | null {
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();
    if (!publicUrl) return null;
    try {
        return new URL(publicUrl.replace(/\/+$/, '')).hostname;
    } catch {
        return null;
    }
}

function getR2PublicBaseUrl(): string {
    return (process.env.CLOUDFLARE_R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');
}

/** Reescribe URLs legadas de Backblaze B2 al dominio público de R2 (mismos object keys). */
export function rewriteLegacyBackblazeUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed || !/backblazeb2\.com/i.test(trimmed)) return trimmed;

    try {
        const parsed = new URL(trimmed);
        // https://f005.backblazeb2.com/file/simple-media/<key>
        const match = parsed.pathname.match(/^\/file\/([^/]+)\/(.+)$/);
        if (!match) return trimmed;
        const [, bucket, key] = match;
        const expectedBucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'simple-media';
        if (bucket !== expectedBucket) return trimmed;
        const publicBase = getR2PublicBaseUrl();
        if (!publicBase) return trimmed;
        return `${publicBase}/${decodeURIComponent(key)}`;
    } catch {
        return trimmed;
    }
}

export function isCloudflareR2Url(url: string): boolean {
    try {
        const hostname = new URL(url).hostname;
        if (hostname.endsWith('.r2.cloudflarestorage.com') || hostname.endsWith('.r2.dev')) {
            return true;
        }
        const customHost = getR2PublicHostname();
        return customHost ? hostname === customHost : false;
    } catch {
        return false;
    }
}

function isLocalStorageUrl(url: string): boolean {
    const trimmed = url.trim();
    if (trimmed.startsWith('/uploads/')) return true;

    try {
        const parsed = new URL(trimmed);
        if (parsed.pathname.startsWith('/uploads/')) {
            return parsed.hostname === 'localhost'
                || parsed.hostname === '127.0.0.1'
                || parsed.hostname.endsWith('.simpleplataforma.app');
        }
    } catch {
        // ignore
    }

    const base = (process.env.LOCAL_STORAGE_URL || 'http://localhost:4000/uploads').replace(/\/+$/, '');
    return trimmed.startsWith(base);
}

export function isOwnedStorageUrl(url: string): boolean {
    if (!url?.trim()) return false;
    if (isCloudflareR2Url(url)) return extractR2ObjectKey(url).length > 0;
    return isLocalStorageUrl(url);
}

/** Alias histórico */
export function isStorageUrl(url: string): boolean {
    return isOwnedStorageUrl(url);
}

export function extractR2ObjectKey(url: string): string {
    if (!isCloudflareR2Url(url)) return '';
    try {
        const parsed = new URL(url);
        const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'simple-media';
        const customHost = getR2PublicHostname();

        if (customHost && parsed.hostname === customHost) {
            return decodeURIComponent(parsed.pathname.replace(/^\//, ''));
        }

        if (parsed.hostname.endsWith('.r2.dev')) {
            return decodeURIComponent(parsed.pathname.slice(1));
        }

        const prefix = `/${bucketName}/`;
        if (parsed.pathname.startsWith(prefix)) {
            return decodeURIComponent(parsed.pathname.slice(prefix.length));
        }
    } catch {
        return '';
    }
    return '';
}

export function extractStorageObjectKey(url: string): string {
    return extractR2ObjectKey(url);
}

export function buildMediaProxyUrl(url: string): string {
    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
    return `${apiBaseUrl}/api/media/proxy?src=${encodeURIComponent(url)}`;
}

export function toDeliveredMediaUrl(url: string): string {
    const normalized = rewriteLegacyBackblazeUrl(url.trim());
    if (!normalized) return '';

    const apiBaseUrl = process.env.API_BASE_URL;
    if (
        isCloudflareR2Url(normalized)
        && isProduction
        && (!apiBaseUrl || apiBaseUrl.includes('localhost'))
    ) {
        return normalized;
    }

    return normalized;
}

export function normalizeMediaValueForResponse(value: unknown): unknown {
    if (typeof value === 'string') {
        return toDeliveredMediaUrl(value);
    }
    if (!value || typeof value !== 'object') {
        return value;
    }

    const item = value as Record<string, unknown>;
    const next: Record<string, unknown> = { ...item };

    if (typeof item.url === 'string') {
        next.url = toDeliveredMediaUrl(item.url);
    }
    if (typeof item.previewUrl === 'string') {
        next.previewUrl = toDeliveredMediaUrl(item.previewUrl);
    }
    if (typeof item.dataUrl === 'string' && /^https?:\/\//i.test(item.dataUrl)) {
        next.dataUrl = toDeliveredMediaUrl(item.dataUrl);
    }

    return next;
}

export function normalizeListingRawDataForResponse(rawData: unknown): unknown {
    if (!rawData || typeof rawData !== 'object') return rawData ?? null;

    const payload = asObject(rawData);
    const media = asObject(payload.media);
    if (Object.keys(media).length === 0) return rawData;

    return {
        ...payload,
        media: {
            ...media,
            photos: Array.isArray(media.photos)
                ? media.photos.map((photo) => normalizeMediaValueForResponse(photo))
                : media.photos,
            discoverVideo: normalizeMediaValueForResponse(media.discoverVideo),
            video: normalizeMediaValueForResponse(media.video),
        },
    };
}

export function toPublicMediaUrl(value: unknown): string {
    if (typeof value === 'string') return toDeliveredMediaUrl(value.trim());
    if (!value || typeof value !== 'object') return '';
    const item = value as Record<string, unknown>;
    const rawUrl = asString(item.url) || asString(item.previewUrl) || asString(item.dataUrl);
    return toDeliveredMediaUrl(rawUrl);
}

type ListingMediaSource = { rawData?: unknown };

function collectMediaFieldUrls(media: Record<string, unknown>): string[] {
    const urls: string[] = [];

    const photos = Array.isArray(media.photos) ? media.photos : [];
    for (const photo of photos) {
        const url = toPublicMediaUrl(photo);
        if (url) urls.push(url);
    }

    for (const key of ['discoverVideo', 'video'] as const) {
        const item = media[key];
        if (item) {
            const url = toPublicMediaUrl(item);
            if (url) urls.push(url);
        }
    }

    return urls;
}

export function extractAllListingMediaUrls(record: ListingMediaSource): string[] {
    const payload = asObject(record.rawData);
    const media = asObject(payload.media);
    return collectMediaFieldUrls(media);
}

export function extractListingMediaUrls(record: ListingMediaSource): string[] {
    const payload = asObject(record.rawData);
    const media = asObject(payload.media);
    const photos = Array.isArray(media.photos) ? media.photos : [];
    const urls = photos
        .map((photo) => toPublicMediaUrl(photo))
        .filter((url) => url.length > 0)
        .slice(0, 6);
    const remoteUrls = urls.filter((url) => !url.startsWith('data:'));
    return remoteUrls.length > 0 ? remoteUrls : urls;
}

export function extractListingVideoUrl(record: ListingMediaSource): string | null {
    const payload = asObject(record.rawData);
    const media = asObject(payload.media);
    const discoverVideo = asObject(media.discoverVideo);
    const direct = toPublicMediaUrl(media.videoUrl);
    if (direct) return direct;
    const uploaded = toPublicMediaUrl(discoverVideo);
    return uploaded || null;
}
