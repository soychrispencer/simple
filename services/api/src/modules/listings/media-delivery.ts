import { isProduction } from '../../env.js';
import { asObject, asString } from '../shared/helpers.js';

export function fixBrokenB2Url(url: string): string {
    if (!url || !url.startsWith('http')) return url;

    if (url.includes('backblazeb2.com')) {
        const bucketName = process.env.BACKBLAZE_BUCKET_NAME || 'simple-media';

        let key = '';
        if (url.includes(`/file/${bucketName}/`)) {
            key = url.split(`/file/${bucketName}/`)[1];
        } else if (url.includes(`backblazeb2.com/${bucketName}/`)) {
            key = url.split(`backblazeb2.com/${bucketName}/`)[1];
        } else {
            const parts = url.split('.backblazeb2.com/');
            if (parts.length === 2) {
                const pathParts = parts[1].split('/');
                if (pathParts[0] === 'file') pathParts.shift();
                if (pathParts[0] === bucketName) pathParts.shift();
                key = pathParts.join('/');
            }
        }

        if (key) {
            const downloadOrigin = process.env.BACKBLAZE_DOWNLOAD_URL || 'https://f005.backblazeb2.com';
            return `${downloadOrigin}/file/${bucketName}/${key}`;
        }
    }

    return url;
}

export function isBackblazeUrl(url: string): boolean {
    try {
        return new URL(url).hostname.endsWith('backblazeb2.com');
    } catch {
        return false;
    }
}

export function isCloudflareR2Url(url: string): boolean {
    try {
        const hostname = new URL(url).hostname;
        return hostname.endsWith('.r2.cloudflarestorage.com') || hostname.endsWith('.r2.dev');
    } catch {
        return false;
    }
}

export function isStorageUrl(url: string): boolean {
    return isBackblazeUrl(url) || isCloudflareR2Url(url);
}

export function extractBackblazeObjectKey(url: string): string {
    if (!isBackblazeUrl(url)) return '';
    const bucketName = process.env.BACKBLAZE_BUCKET_NAME || 'simple-media';
    const normalized = fixBrokenB2Url(url);
    try {
        const parsed = new URL(normalized);
        const prefix = `/file/${bucketName}/`;
        if (parsed.pathname.startsWith(prefix)) {
            return decodeURIComponent(parsed.pathname.slice(prefix.length));
        }
    } catch {
        return '';
    }
    return '';
}

export function extractR2ObjectKey(url: string): string {
    if (!isCloudflareR2Url(url)) return '';
    try {
        const parsed = new URL(url);
        const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'simple-media';

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
    if (isBackblazeUrl(url)) {
        return extractBackblazeObjectKey(url);
    }
    if (isCloudflareR2Url(url)) {
        return extractR2ObjectKey(url);
    }
    return '';
}

export function buildMediaProxyUrl(url: string): string {
    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
    return `${apiBaseUrl}/api/media/proxy?src=${encodeURIComponent(fixBrokenB2Url(url))}`;
}

export function toDeliveredMediaUrl(url: string): string {
    const normalized = fixBrokenB2Url(url);
    const apiBaseUrl = process.env.API_BASE_URL;

    if (isBackblazeUrl(normalized)) {
        if (isProduction && (!apiBaseUrl || apiBaseUrl.includes('localhost'))) {
            return normalized;
        }
        return buildMediaProxyUrl(normalized);
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

export function extractAllListingMediaUrls(record: ListingMediaSource): string[] {
    const payload = asObject(record.rawData);
    const media = asObject(payload.media);
    const urls: string[] = [];
    const photos = Array.isArray(media.photos) ? media.photos : [];
    for (const photo of photos) {
        const url = toPublicMediaUrl(photo);
        if (url) urls.push(url);
    }
    const discoverVideo = media.discoverVideo;
    if (discoverVideo && typeof discoverVideo === 'object') {
        const url = toPublicMediaUrl(discoverVideo);
        if (url) urls.push(url);
    }
    return urls;
}

export function extractListingMediaUrls(record: ListingMediaSource): string[] {
    const payload = asObject(record.rawData);
    const media = asObject(payload.media);
    const photos = Array.isArray(media.photos) ? media.photos : [];
    const urls = photos
        .map((photo) => toPublicMediaUrl(photo))
        .filter((url) => url.length > 0)
        .slice(0, 8);
    const remoteUrls = urls.filter((url) => !url.startsWith('data:'));
    return remoteUrls.length > 0 ? remoteUrls : urls;
}
