import type { VerticalType } from '@simple/types';
import type { InstagramMediaFormat } from '../instagram/publish-listing.js';

export type SocialPublishTarget =
    | 'instagram_carousel'
    | 'instagram_reel'
    | 'facebook'
    | 'tiktok'
    | 'youtube'
    | 'all';

export type SocialHubPublishResult = {
    target: SocialPublishTarget;
    ok: boolean;
    message: string;
    permalink?: string | null;
    publication?: unknown;
};

export type SocialHubPublishDeps = {
    extractListingVideoUrl: (listing: { [key: string]: unknown }) => string | null;
    publishListingToInstagram: (
        user: { id: string; role?: string },
        listing: { id: string; vertical: VerticalType; status: string; title: string; updatedAt: number; [key: string]: unknown },
        options: { mediaFormat?: InstagramMediaFormat; captionOverride?: string | null },
    ) => Promise<unknown>;
    publishListingToFacebookPage: (
        user: { id: string; role?: string },
        listing: { id: string; vertical: VerticalType; status: string; title: string; updatedAt: number; [key: string]: unknown },
        options: { captionOverride?: string | null },
    ) => Promise<unknown>;
    publishListingToTikTok: (
        user: { id: string; role?: string },
        listing: { id: string; vertical: VerticalType; status: string; title: string; updatedAt: number; [key: string]: unknown },
        options: { captionOverride?: string | null },
    ) => Promise<unknown>;
    publishListingToYouTube: (
        user: { id: string; role?: string },
        listing: { id: string; vertical: VerticalType; status: string; title: string; updatedAt: number; [key: string]: unknown },
        options: { captionOverride?: string | null },
    ) => Promise<unknown>;
};

function resolveTargets(
    requested: SocialPublishTarget[] | undefined,
    publishAll: boolean | undefined,
    hasVideo: boolean,
): SocialPublishTarget[] {
    if (publishAll) {
        const targets: SocialPublishTarget[] = ['instagram_carousel', 'facebook'];
        if (hasVideo) targets.push('instagram_reel', 'tiktok', 'youtube');
        return targets;
    }
    if (requested?.length) return requested;
    return ['instagram_carousel', 'facebook'];
}

function publicationPermalink(publication: unknown): string | null {
    if (!publication || typeof publication !== 'object') return null;
    const record = publication as Record<string, unknown>;
    return typeof record.instagramPermalink === 'string'
        ? record.instagramPermalink
        : typeof record.permalink === 'string'
            ? record.permalink
            : null;
}

export function createSocialHubPublisher(deps: SocialHubPublishDeps) {
    return async function publishListingToSocialHub(
        user: { id: string; role?: string },
        listing: { id: string; vertical: VerticalType; status: string; title: string; updatedAt: number; [key: string]: unknown },
        options: {
            targets?: SocialPublishTarget[];
            publishAll?: boolean;
            captionOverride?: string | null;
        } = {},
    ): Promise<SocialHubPublishResult[]> {
        const hasVideo = Boolean(deps.extractListingVideoUrl(listing));
        const targets = resolveTargets(options.targets, options.publishAll, hasVideo);
        const results: SocialHubPublishResult[] = [];

        for (const target of targets) {
            if ((target === 'tiktok' || target === 'youtube' || target === 'instagram_reel') && !hasVideo) {
                results.push({
                    target,
                    ok: false,
                    message: target === 'instagram_reel'
                        ? 'Sube un video al aviso para publicar un Reel en Instagram.'
                        : target === 'tiktok'
                            ? 'Sube o genera un video en el aviso antes de publicar en TikTok.'
                            : 'Sube o genera un video en el aviso antes de publicar en YouTube Shorts.',
                });
                continue;
            }

            try {
                if (target === 'instagram_carousel' || target === 'instagram_reel') {
                    const publication = await deps.publishListingToInstagram(user, listing, {
                        mediaFormat: target === 'instagram_reel' ? 'reel' : 'carousel',
                        captionOverride: options.captionOverride ?? null,
                    });
                    results.push({
                        target,
                        ok: true,
                        message: target === 'instagram_reel'
                            ? 'Reel publicado en Instagram.'
                            : 'Carrusel publicado en Instagram.',
                        permalink: publicationPermalink(publication),
                        publication,
                    });
                    continue;
                }

                if (target === 'facebook') {
                    const publication = await deps.publishListingToFacebookPage(user, listing, {
                        captionOverride: options.captionOverride ?? null,
                    });
                    results.push({
                        target,
                        ok: true,
                        message: 'Publicado en tu Página de Facebook.',
                        permalink: publicationPermalink(publication),
                        publication,
                    });
                    continue;
                }

                if (target === 'tiktok') {
                    const publication = await deps.publishListingToTikTok(user, listing, {
                        captionOverride: options.captionOverride ?? null,
                    });
                    results.push({
                        target,
                        ok: true,
                        message: 'Video publicado en TikTok.',
                        permalink: publicationPermalink(publication),
                        publication,
                    });
                    continue;
                }

                if (target === 'youtube') {
                    const publication = await deps.publishListingToYouTube(user, listing, {
                        captionOverride: options.captionOverride ?? null,
                    });
                    results.push({
                        target,
                        ok: true,
                        message: 'Short publicado en YouTube.',
                        permalink: publicationPermalink(publication),
                        publication,
                    });
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'No se pudo publicar.';
                results.push({ target, ok: false, message });
            }
        }

        return results;
    };
}
