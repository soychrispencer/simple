import { resolveAppMediaUrl } from '@simple/utils';

type ListingMediaSource = {
    rawData?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : fallback;
}

function readMediaUrl(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    const obj = asRecord(value);
    // Prefer durable URL over local previews / ephemeral data URLs.
    return asString(obj.url) || asString(obj.previewUrl) || asString(obj.dataUrl);
}

export function getListingVideoUrl(listing: ListingMediaSource): string | null {
    const media = asRecord(asRecord(listing.rawData).media);
    const direct = readMediaUrl(media.videoUrl);
    if (direct) return direct;
    const uploaded = readMediaUrl(media.discoverVideo);
    return uploaded || null;
}

export function listingHasShareableVideo(listing: ListingMediaSource): boolean {
    const url = getListingVideoUrl(listing);
    return Boolean(url && url.startsWith('http'));
}

export function getListingPhotoUrls(listing: ListingMediaSource): string[] {
    const media = asRecord(asRecord(listing.rawData).media);
    const photos = Array.isArray(media.photos) ? media.photos : [];
    return photos
        .map((photo) => {
            const raw = readMediaUrl(photo);
            return raw ? (resolveAppMediaUrl(raw) ?? raw) : '';
        })
        .filter((url) => Boolean(url));
}

/** Cover photo for panel thumbnails; falls back to first available photo. */
export function getListingCoverUrl(listing: ListingMediaSource): string | null {
    const media = asRecord(asRecord(listing.rawData).media);
    const photos = Array.isArray(media.photos) ? media.photos : [];
    if (photos.length === 0) return null;

    const cover = photos.find((photo) => asRecord(photo).isCover === true) ?? photos[0];
    const raw = readMediaUrl(cover);
    if (!raw) {
        const urls = getListingPhotoUrls(listing);
        return urls[0] ?? null;
    }
    return resolveAppMediaUrl(raw) ?? raw;
}
