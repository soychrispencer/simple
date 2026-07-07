/** YouTube/Vimeo no se reproducen con `<video src>`. */
export function isEmbedOnlyVideoUrl(url: string): boolean {
    try {
        const host = new URL(url.trim()).hostname.replace(/^www\./, '').toLowerCase();
        return host === 'youtube.com'
            || host === 'youtu.be'
            || host === 'm.youtube.com'
            || host === 'vimeo.com'
            || host.endsWith('.vimeo.com');
    } catch {
        return false;
    }
}

export function isNativePlayableVideoUrl(url: string | undefined | null): url is string {
    const trimmed = url?.trim() ?? '';
    if (!trimmed) return false;
    if (isEmbedOnlyVideoUrl(trimmed)) return false;
    return trimmed.startsWith('blob:')
        || trimmed.startsWith('data:')
        || trimmed.startsWith('http');
}

export function getVideoEmbedUrl(url: string): string | null {
    try {
        const parsed = new URL(url.trim());
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

        if (host === 'youtu.be') {
            const id = parsed.pathname.replace(/^\//, '').split('/')[0];
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }

        if (host === 'youtube.com' || host === 'm.youtube.com') {
            const fromQuery = parsed.searchParams.get('v');
            const fromPath = parsed.pathname.startsWith('/embed/')
                ? parsed.pathname.split('/')[2]
                : parsed.pathname.startsWith('/shorts/')
                    ? parsed.pathname.split('/')[2]
                    : null;
            const id = fromQuery ?? fromPath;
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }

        if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
            const id = parsed.pathname.split('/').filter(Boolean).pop();
            return id ? `https://player.vimeo.com/video/${id}` : null;
        }
    } catch {
        return null;
    }

    return null;
}

export type ListingDetailMediaSlide =
    | { type: 'video-native'; url: string }
    | { type: 'video-embed'; url: string }
    | { type: 'image'; url: string };

export function buildListingDetailMediaSlides(input: {
    images?: string[];
    videoUrl?: string | null;
}): ListingDetailMediaSlide[] {
    const slides: ListingDetailMediaSlide[] = [];
    const images = (input.images ?? []).filter((url) => Boolean(url?.trim()));

    if (input.videoUrl?.trim()) {
        if (isNativePlayableVideoUrl(input.videoUrl)) {
            slides.push({ type: 'video-native', url: input.videoUrl.trim() });
        } else {
            const embedUrl = getVideoEmbedUrl(input.videoUrl);
            if (embedUrl) slides.push({ type: 'video-embed', url: embedUrl });
        }
    }

    for (const url of images) {
        slides.push({ type: 'image', url });
    }

    return slides;
}
