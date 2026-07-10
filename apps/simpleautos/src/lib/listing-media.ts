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
    return asString(obj.dataUrl) || asString(obj.previewUrl) || asString(obj.url);
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
        .map((photo) => readMediaUrl(photo))
        .filter((url) => Boolean(url));
}
