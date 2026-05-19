import { randomUUID } from 'node:crypto';
import { logger } from '@simple/logger';
import type { VerticalType } from '@simple/types';
import type { InstagramTemplateView } from './templates.js';
import {
    publishInstagramCarousel,
    publishInstagramImage,
    refreshInstagramAccessToken,
} from './service.js';
import type { InstagramAccountRecord, InstagramPublicationRecord } from './account-store.js';

export type PublishListingUser = {
    id: string;
    role?: string;
};

export type PublishListingRecord = {
    id: string;
    vertical: VerticalType;
    status: string;
    title: string;
    updatedAt: number;
    [key: string]: unknown;
};

export type PublishListingToInstagramDeps = {
    getInstagramAccount: (userId: string, vertical: VerticalType) => InstagramAccountRecord | null;
    userCanUseInstagram: (user: PublishListingUser, vertical: VerticalType) => boolean;
    getLatestInstagramPublicationForListing: (
        userId: string,
        vertical: VerticalType,
        listingId: string,
    ) => InstagramPublicationRecord | null;
    instagramPublicationToResponse: (record: InstagramPublicationRecord) => unknown;
    refreshInstagramAccountIfNeeded: (account: InstagramAccountRecord) => Promise<InstagramAccountRecord>;
    buildListingPublicUrlForInstagram: (listing: PublishListingRecord) => string;
    extractListingMediaUrls: (listing: PublishListingRecord) => string[];
    prepareInstagramImageUrl: (
        listing: PublishListingRecord,
        index: number,
        options: {
            layoutVariant?: 'square' | 'portrait' | null;
            template?: InstagramTemplateView | null;
            publishKey?: string | null;
            isCover?: boolean;
        },
    ) => Promise<string>;
    buildInstagramCaption: (
        listing: PublishListingRecord,
        publicUrl: string,
        template: string | null,
        override: string | null,
    ) => string;
    logDebug: (message: string) => void;
    createInstagramPublicationRecord: (
        input: Omit<InstagramPublicationRecord, 'id' | 'createdAt' | 'updatedAt' | 'accountId'>,
    ) => Promise<InstagramPublicationRecord>;
    updateInstagramAccountSettings: (
        userId: string,
        vertical: VerticalType,
        patch: Partial<InstagramAccountRecord>,
    ) => Promise<InstagramAccountRecord | null>;
};

export function createPublishListingToInstagram(deps: PublishListingToInstagramDeps) {
    return async function publishListingToInstagram(
        user: PublishListingUser,
        listing: PublishListingRecord,
        options: {
            captionOverride?: string | null;
            auto?: boolean;
            template?: InstagramTemplateView | null;
        } = {},
    ) {
        const account = deps.getInstagramAccount(user.id, listing.vertical);
        if (!account || account.status === 'disconnected') {
            throw new Error('Primero conecta una cuenta de Instagram.');
        }

        if (!deps.userCanUseInstagram(user, listing.vertical)) {
            throw new Error('Instagram está disponible solo para planes Pro y Empresa.');
        }
        if (listing.status !== 'active') {
            throw new Error('Solo puedes publicar en Instagram avisos activos.');
        }

        const latest = deps.getLatestInstagramPublicationForListing(user.id, listing.vertical, listing.id);
        if (options.auto && latest?.status === 'published' && latest.sourceUpdatedAt === listing.updatedAt) {
            return deps.instagramPublicationToResponse(latest);
        }

        const refreshedAccount = await deps.refreshInstagramAccountIfNeeded(account);
        const publicUrl = deps.buildListingPublicUrlForInstagram(listing);
        const mediaUrls = deps.extractListingMediaUrls(listing).slice(0, 10);
        if (mediaUrls.length === 0) {
            deps.logDebug(`[instagram] no media for listing ${listing.id}`);
            throw new Error('El aviso no tiene imágenes.');
        }

        deps.logDebug(`[instagram] preparing ${mediaUrls.length} images for ${listing.id}`);
        const preparedImages: Array<{ url: string }> = [];
        const publishKey = randomUUID();

        try {
            const coverTemplate = options.template ?? null;
            const coverUrl = await deps.prepareInstagramImageUrl(listing, 0, {
                layoutVariant: coverTemplate?.layoutVariant ?? null,
                template: coverTemplate,
                publishKey,
                isCover: true,
            });
            if (coverUrl && coverUrl.startsWith('http')) {
                preparedImages.push({ url: coverUrl });
            }
            logger.info('[instagram] cover image prepared', {
                listingId: listing.id,
                templateId: coverTemplate?.id ?? null,
                url: coverUrl,
            });
        } catch (e) {
            console.error('[instagram] failed to prepare cover image:', {
                listingId: listing.id,
                templateId: options.template?.id ?? null,
                error: e instanceof Error ? e.message : String(e),
            });
            deps.logDebug(
                `[instagram] failed to prepare cover image: ${e instanceof Error ? e.message : String(e)}`,
            );
        }

        const watermarkTemplate: InstagramTemplateView | null = options.template
            ? {
                  ...options.template,
                  overlayVariant: 'essential-watermark',
                  title: '',
                  headline: '',
                  subtitle: undefined,
                  priceLabel: '',
                  offerPriceLabel: undefined,
                  discountLabel: undefined,
                  locationLabel: undefined,
                  highlights: [],
                  badges: [],
                  ctaLabel: '',
                  eyebrow: '',
              }
            : null;

        for (let i = 1; i < mediaUrls.length; i++) {
            try {
                const url = await deps.prepareInstagramImageUrl(listing, i, {
                    layoutVariant: options.template?.layoutVariant ?? null,
                    template: watermarkTemplate,
                    publishKey,
                    isCover: false,
                });
                if (!url || !url.startsWith('http')) {
                    deps.logDebug(`[instagram] skipped image ${i}: invalid URL "${url}"`);
                    continue;
                }

                const check = await fetch(url, { method: 'HEAD' }).catch((e) => {
                    deps.logDebug(`[instagram] HEAD check failed for image ${i}: ${e.message}`);
                    return null;
                });
                if (!check || !check.ok) {
                    deps.logDebug(
                        `[instagram] image ${i} might not be accessible: ${url} (status: ${check?.status})`,
                    );
                }
                preparedImages.push({ url });
            } catch (e) {
                deps.logDebug(
                    `[instagram] failed to prepare image ${i}: ${e instanceof Error ? e.message : String(e)}`,
                );
            }
        }

        if (preparedImages.length === 0) {
            throw new Error(
                'No se pudo preparar ninguna imagen válida para Instagram. Verifica que el aviso tenga fotos públicas y accesibles.',
            );
        }

        const caption = deps.buildInstagramCaption(
            listing,
            publicUrl,
            refreshedAccount.captionTemplate,
            options.captionOverride ?? null,
        );
        deps.logDebug(`[instagram] final caption for ${listing.id}: ${caption.slice(0, 50)}...`);
        deps.logDebug(
            `[instagram] publishing to ${refreshedAccount.instagramUserId} as ${preparedImages.length > 1 ? 'CAROUSEL' : 'IMAGE'}`,
        );

        try {
            let published: { mediaId: string; permalink: string | null };

            if (preparedImages.length > 1) {
                published = await publishInstagramCarousel({
                    instagramUserId: refreshedAccount.instagramUserId,
                    accessToken: refreshedAccount.accessToken,
                    images: preparedImages,
                    caption,
                });
            } else {
                published = await publishInstagramImage({
                    instagramUserId: refreshedAccount.instagramUserId,
                    accessToken: refreshedAccount.accessToken,
                    imageUrl: preparedImages[0].url,
                    caption,
                });
            }
            deps.logDebug(`[instagram] publish success: ${published.mediaId}`);

            const publication = await deps.createInstagramPublicationRecord({
                userId: user.id,
                instagramAccountId: refreshedAccount.id,
                vertical: listing.vertical,
                listingId: listing.id,
                listingTitle: listing.title,
                instagramMediaId: published.mediaId,
                instagramPermalink: published.permalink,
                caption,
                imageUrl: preparedImages[0].url,
                status: 'published',
                errorMessage: null,
                sourceUpdatedAt: listing.updatedAt,
                publishedAt: Date.now(),
            });

            await deps.updateInstagramAccountSettings(user.id, listing.vertical, {
                lastPublishedAt: publication.publishedAt,
                lastSyncedAt: Date.now(),
                lastError: null,
                status: 'connected',
            });

            return deps.instagramPublicationToResponse(publication);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo publicar en Instagram.';
            await deps.createInstagramPublicationRecord({
                userId: user.id,
                instagramAccountId: refreshedAccount.id,
                vertical: listing.vertical,
                listingId: listing.id,
                listingTitle: listing.title,
                instagramMediaId: null,
                instagramPermalink: null,
                caption,
                imageUrl: preparedImages.length > 0 ? preparedImages[0].url : '',
                status: 'failed',
                errorMessage: message,
                sourceUpdatedAt: listing.updatedAt,
                publishedAt: null,
            });
            await deps.updateInstagramAccountSettings(user.id, listing.vertical, {
                lastSyncedAt: Date.now(),
                lastError: message,
                status: 'error',
            });
            throw error;
        }
    };
}

export function createMaybeAutoPublishListing(
    deps: PublishListingToInstagramDeps & {
        publishListingToInstagram: ReturnType<typeof createPublishListingToInstagram>;
    },
) {
    return async function maybeAutoPublishListing(
        user: PublishListingUser,
        listing: PublishListingRecord,
    ): Promise<void> {
        const account = deps.getInstagramAccount(user.id, listing.vertical);
        if (!account?.autoPublishEnabled) return;
        if (!deps.userCanUseInstagram(user, listing.vertical)) return;
        if (listing.status !== 'active') return;

        const latest = deps.getLatestInstagramPublicationForListing(user.id, listing.vertical, listing.id);
        if (latest?.status === 'published' && latest.sourceUpdatedAt === listing.updatedAt) return;

        await deps.publishListingToInstagram(user, listing, { auto: true }).catch(() => null);
    };
}

export async function refreshInstagramAccountIfNeeded(
    account: InstagramAccountRecord,
    updateInstagramAccountSettings: PublishListingToInstagramDeps['updateInstagramAccountSettings'],
): Promise<InstagramAccountRecord> {
    const needsRefresh = !account.tokenExpiresAt || account.tokenExpiresAt - Date.now() <= 1000 * 60 * 60 * 24 * 7;
    if (!needsRefresh) return account;

    const refreshed = await refreshInstagramAccessToken(account.accessToken);
    if (!refreshed?.accessToken) return account;

    return (
        (await updateInstagramAccountSettings(account.userId, account.vertical, {
            accessToken: refreshed.accessToken,
            tokenExpiresAt: refreshed.expiresInSeconds
                ? Date.now() + refreshed.expiresInSeconds * 1000
                : account.tokenExpiresAt,
            lastSyncedAt: Date.now(),
            lastError: null,
            status: 'connected',
        })) ?? account
    );
}
