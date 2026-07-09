import type { VerticalType } from '@simple/types';
import type { SocialPublicationContentType, SocialPublicationRecord, YouTubeAccountRecord } from '../../lib/domain-types.js';
import { publishYouTubeShort, refreshYouTubeAccessToken } from './service.js';

export type PublishYouTubeListingUser = { id: string; role?: string };

export type PublishYouTubeListingRecord = {
    id: string;
    vertical: VerticalType;
    status: string;
    title: string;
    description?: string;
    updatedAt: number;
    [key: string]: unknown;
};

export type PublishListingToYouTubeDeps = {
    getYouTubeAccount: (userId: string, vertical: VerticalType) => YouTubeAccountRecord | null;
    userCanUseInstagram: (user: PublishYouTubeListingUser, vertical: VerticalType) => boolean;
    getLatestSocialPublicationForListing: (
        userId: string,
        vertical: VerticalType,
        listingId: string,
        platform: 'youtube',
        contentType?: SocialPublicationContentType,
    ) => SocialPublicationRecord | null;
    socialPublicationToResponse: (record: SocialPublicationRecord) => unknown;
    buildListingPublicUrl: (listing: PublishYouTubeListingRecord) => string;
    extractListingVideoUrl: (listing: PublishYouTubeListingRecord) => string | null;
    buildListingCaption: (
        listing: PublishYouTubeListingRecord,
        publicUrl: string,
        template: string | null,
        override: string | null,
    ) => string;
    createSocialPublicationRecord: (
        input: Omit<SocialPublicationRecord, 'id' | 'createdAt' | 'updatedAt' | 'accountId'>,
    ) => Promise<SocialPublicationRecord>;
    updateYouTubeAccountRecord: (
        userId: string,
        vertical: VerticalType,
        patch: Partial<YouTubeAccountRecord>,
    ) => Promise<YouTubeAccountRecord | null>;
};

async function refreshYouTubeAccountIfNeeded(
    account: YouTubeAccountRecord,
    update: PublishListingToYouTubeDeps['updateYouTubeAccountRecord'],
): Promise<YouTubeAccountRecord> {
    const expiresSoon = account.tokenExpiresAt && account.tokenExpiresAt < Date.now() + 60_000;
    if (!expiresSoon || !account.refreshToken) return account;
    const refreshed = await refreshYouTubeAccessToken(account.refreshToken);
    const updated = await update(account.userId, account.vertical, {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? account.refreshToken,
        tokenExpiresAt: refreshed.expiresInSeconds ? Date.now() + refreshed.expiresInSeconds * 1000 : null,
        scopes: refreshed.scopes,
        lastSyncedAt: Date.now(),
        lastError: null,
    });
    return updated ?? account;
}

export function createPublishListingToYouTube(deps: PublishListingToYouTubeDeps) {
    return async function publishListingToYouTube(
        user: PublishYouTubeListingUser,
        listing: PublishYouTubeListingRecord,
        options: { captionOverride?: string | null } = {},
    ) {
        const account = deps.getYouTubeAccount(user.id, listing.vertical);
        if (!account || account.status === 'disconnected') {
            throw new Error('Primero conecta tu canal de YouTube.');
        }
        if (!deps.userCanUseInstagram(user, listing.vertical)) {
            throw new Error('YouTube está disponible solo para planes Pro y Empresa.');
        }
        if (listing.status !== 'active') {
            throw new Error('Solo puedes publicar en YouTube avisos activos.');
        }

        const videoUrl = deps.extractListingVideoUrl(listing);
        if (!videoUrl) {
            throw new Error('Sube o genera un video en el aviso antes de publicar en YouTube Shorts.');
        }

        const latest = deps.getLatestSocialPublicationForListing(user.id, listing.vertical, listing.id, 'youtube', 'video');
        if (latest?.status === 'published' && latest.sourceUpdatedAt === listing.updatedAt) {
            return deps.socialPublicationToResponse(latest);
        }

        const publicUrl = deps.buildListingPublicUrl(listing);
        const caption = deps.buildListingCaption(listing, publicUrl, null, options.captionOverride ?? null);
        const refreshed = await refreshYouTubeAccountIfNeeded(account, deps.updateYouTubeAccountRecord);

        try {
            const result = await publishYouTubeShort({
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken,
                videoUrl,
                title: listing.title,
                description: options.captionOverride?.trim() || caption,
                vertical: listing.vertical,
                listingRawData: listing.rawData,
            });

            const publication = await deps.createSocialPublicationRecord({
                userId: user.id,
                vertical: listing.vertical,
                listingId: listing.id,
                listingTitle: listing.title,
                platform: 'youtube',
                contentType: 'video',
                externalId: result.videoId,
                permalink: result.permalink,
                caption,
                mediaUrl: videoUrl,
                status: 'published',
                errorMessage: null,
                sourceUpdatedAt: listing.updatedAt,
                publishedAt: Date.now(),
            });

            await deps.updateYouTubeAccountRecord(user.id, listing.vertical, {
                lastPublishedAt: Date.now(),
                lastError: null,
            });

            return deps.socialPublicationToResponse(publication);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo publicar en YouTube.';
            await deps.createSocialPublicationRecord({
                userId: user.id,
                vertical: listing.vertical,
                listingId: listing.id,
                listingTitle: listing.title,
                platform: 'youtube',
                contentType: 'video',
                externalId: null,
                permalink: null,
                caption,
                mediaUrl: videoUrl,
                status: 'failed',
                errorMessage: message,
                sourceUpdatedAt: listing.updatedAt,
                publishedAt: null,
            });
            await deps.updateYouTubeAccountRecord(user.id, listing.vertical, { lastError: message });
            throw new Error(message);
        }
    };
}
