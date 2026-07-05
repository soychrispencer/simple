/** YouTube o Vimeo — alternativa al clip subido en la misma publicación. */
export function isSupportedExternalVideoUrl(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return true;
    try {
        const url = new URL(trimmed);
        const host = url.hostname.replace(/^www\./, '').toLowerCase();
        return host === 'youtube.com'
            || host === 'youtu.be'
            || host === 'm.youtube.com'
            || host === 'vimeo.com'
            || host.endsWith('.vimeo.com');
    } catch {
        return false;
    }
}

export function listingHasPublishVideo(input: {
    uploadPreviewUrl?: string | null;
    externalUrl?: string | null;
}): boolean {
    return Boolean(input.uploadPreviewUrl?.trim() || input.externalUrl?.trim());
}
