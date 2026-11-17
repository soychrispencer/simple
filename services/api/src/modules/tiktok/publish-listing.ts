import type { VerticalType } from '@simple/types';
import type { SocialPublicationContentType, SocialPublicationRecord, TikTokAccountRecord } from '../../lib/domain-types.js';
import { publishTikTokVideo, refreshTikTokAccessToken } from './service.js';

export type PublishTikTokListingUser = { id: string; role?: string };

export type PublishTikTokListingRecord = {
    id: string;
    accountId?: string | null;
    vertical: VerticalType;
    status: string;
    title: string;
    updatedAt: number;
    [key: string]: unknown;
};

export type PublishListingToTikTokDeps = {
    getTikTokAccount: (userId: string, vertical: VerticalType, accountId?: string | null) => TikTokAccountRecord | null;
    userCanUseInstagram: (user: PublishTikTokListingUser, vertical: VerticalType, accountId?: string | null) => boolean;
    getLatestSocialPublicationForListing: (
        userId: string,
        vertical: VerticalType,
        listingId: string,
        platform: 'tiktok',
        contentType?: SocialPublicationContentType,
        accountId?: string | null,
    ) => SocialPublicationRecord | null;
    socialPublicationToResponse: (record: SocialPublicationRecord) => unknown;
    buildListingPublicUrl: (listing: PublishTikTokListingRecord) => string;
    extractListingVideoUrl: (listing: PublishTikTokListingRecord) => string | null;
    buildListingCaption: (
        listing: PublishTikTokListingRecord,
        publicUrl: string,
        template: string | null,
        override: string | null,
    ) => string;
    createSocialPublicationRecord: (
        input: Omit<SocialPublicationRecord, 'id' | 'createdAt' | 'updatedAt'>,
    ) => Promise<SocialPublicationRecord>;
    updateTikTokAccountRecord: (
        userId: string,
        vertical: VerticalType,
        patch: Partial<TikTokAccountRecord>,
        accountId?: string | null,
    ) => Promise<TikTokAccountRecord | null>;
};

async function refreshTikTokAccountIfNeeded(
    account: TikTokAccountRecord,
    update: PublishListingToTikTokDeps['updateTikTokAccountRecord'],
): Promise<TikTokAccountRecord> {
    const expiresSoon = account.tokenExpiresAt && account.tokenExpiresAt < Date.now() + 60_000;
    if (!expiresSoon || !account.refreshToken) return account;
    const refreshed = await refreshTikTokAccessToken(account.refreshToken);
        const updated = await update(account.userId, account.vertical, {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? account.refreshToken,
        tokenExpiresAt: refreshed.expiresInSeconds ? Date.now() + refreshed.expiresInSeconds * 1000 : null,
        scopes: refreshed.scopes,
        lastSyncedAt: Date.now(),
        lastError: null,
    }, account.accountId);
    return updated ?? account;
}

export function createPublishListingToTikTok(deps: PublishListingToTikTokDeps) {
    return async function publishListingToTikTok(
        user: PublishTikTokListingUser,
        listing: PublishTikTokListingRecord,
        options: { captionOverride?: string | null } = {},
    ) {
        const account = deps.getTikTokAccount(user.id, listing.vertical, listing.accountId ?? null);
        if (!account || account.status === 'disconnected') {
            throw new Error('Primero conecta tu cuenta de TikTok.');
        }
        if (!deps.userCanUseInstagram(user, listing.vertical, listing.accountId ?? null)) {
            throw new Error('TikTok está disponible solo para planes Pro y Empresa.');
        }
        if (listing.status !== 'active') {
            throw new Error('Solo puedes publicar en TikTok avisos activos.');
        }

        const videoUrl = deps.extractListingVideoUrl(listing);
        if (!videoUrl) {
            throw new Error('Sube o genera un video en el aviso antes de publicar en TikTok.');
        }

        const latest = deps.getLatestSocialPublicationForListing(user.id, listing.vertical, listing.id, 'tiktok', 'video', listing.accountId ?? null);
        if (latest?.status === 'published' && latest.sourceUpdatedAt === listing.updatedAt) {
            return deps.socialPublicationToResponse(latest);
        }

        const publicUrl = deps.buildListingPublicUrl(listing);
        const caption = deps.buildListingCaption(listing, publicUrl, null, options.captionOverride ?? null);
        const refreshed = await refreshTikTokAccountIfNeeded(account, deps.updateTikTokAccountRecord);

        try {
            const result = await publishTikTokVideo({
                accessToken: refreshed.accessToken,
                videoUrl,
                title: caption,
            });

            const publication = await deps.createSocialPublicationRecord({
                userId: user.id,
                accountId: listing.accountId ?? account.accountId ?? null,
                vertical: listing.vertical,
                listingId: listing.id,
                listingTitle: listing.title,
                platform: 'tiktok',
                contentType: 'video',
                externalId: result.publishId,
                permalink: result.permalink,
                caption,
                mediaUrl: videoUrl,
                status: 'published',
                errorMessage: null,
                sourceUpdatedAt: listing.updatedAt,
                publishedAt: Date.now(),
            });

            await deps.updateTikTokAccountRecord(user.id, listing.vertical, {
                lastPublishedAt: Date.now(),
                lastError: null,
            }, listing.accountId ?? account.accountId ?? null);

            return deps.socialPublicationToResponse(publication);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo publicar en TikTok.';
            await deps.createSocialPublicationRecord({
                userId: user.id,
                accountId: listing.accountId ?? account.accountId ?? null,
                vertical: listing.vertical,
                listingId: listing.id,
                listingTitle: listing.title,
                platform: 'tiktok',
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
            await deps.updateTikTokAccountRecord(user.id, listing.vertical, { lastError: message }, listing.accountId ?? account.accountId ?? null);
            throw new Error(message, { cause: error });
        }
    };
}
