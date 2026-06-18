import type { VerticalType } from '@simple/types';
import type { InstagramAccountRecord } from '../instagram/account-store.js';
import type { SocialPublicationContentType, SocialPublicationRecord } from '../../lib/domain-types.js';
import { publishFacebookPageLinkPost, publishFacebookPageVideo } from './facebook-page.js';

export type PublishFacebookListingUser = {
    id: string;
    role?: string;
};

export type PublishFacebookListingRecord = {
    id: string;
    vertical: VerticalType;
    status: string;
    title: string;
    updatedAt: number;
    [key: string]: unknown;
};

export type PublishListingToFacebookPageDeps = {
    getInstagramAccount: (userId: string, vertical: VerticalType) => InstagramAccountRecord | null;
    userCanUseInstagram: (user: PublishFacebookListingUser, vertical: VerticalType) => boolean;
    getLatestSocialPublicationForListing: (
        userId: string,
        vertical: VerticalType,
        listingId: string,
        platform: 'facebook',
        contentType?: SocialPublicationContentType,
    ) => SocialPublicationRecord | null;
    socialPublicationToResponse: (record: SocialPublicationRecord) => unknown;
    buildListingPublicUrl: (listing: PublishFacebookListingRecord) => string;
    extractListingMediaUrls: (listing: PublishFacebookListingRecord) => string[];
    extractListingVideoUrl: (listing: PublishFacebookListingRecord) => string | null;
    buildListingCaption: (
        listing: PublishFacebookListingRecord,
        publicUrl: string,
        template: string | null,
        override: string | null,
    ) => string;
    createSocialPublicationRecord: (
        input: Omit<SocialPublicationRecord, 'id' | 'createdAt' | 'updatedAt' | 'accountId'>,
    ) => Promise<SocialPublicationRecord>;
    updateInstagramAccountSettings: (
        userId: string,
        vertical: VerticalType,
        patch: Partial<InstagramAccountRecord>,
    ) => Promise<InstagramAccountRecord | null>;
};

export function createPublishListingToFacebookPage(deps: PublishListingToFacebookPageDeps) {
    return async function publishListingToFacebookPage(
        user: PublishFacebookListingUser,
        listing: PublishFacebookListingRecord,
        options: {
            captionOverride?: string | null;
            auto?: boolean;
        } = {},
    ) {
        const account = deps.getInstagramAccount(user.id, listing.vertical);
        if (!account || account.status === 'disconnected') {
            throw new Error('Primero conecta tu cuenta Meta en Integraciones.');
        }
        if (!deps.userCanUseInstagram(user, listing.vertical)) {
            throw new Error('La publicación en Facebook está disponible solo para planes Pro y Empresa.');
        }
        if (listing.status !== 'active') {
            throw new Error('Solo puedes publicar en Facebook avisos activos.');
        }
        if (!account.facebookPageId || !account.facebookPageAccessToken) {
            throw new Error('Vuelve a conectar Meta para habilitar tu Página de Facebook.');
        }

        const videoUrl = deps.extractListingVideoUrl(listing);
        const contentType: SocialPublicationContentType = videoUrl ? 'video' : 'link';
        const latest = deps.getLatestSocialPublicationForListing(
            user.id,
            listing.vertical,
            listing.id,
            'facebook',
            contentType,
        );
        if (options.auto && latest?.status === 'published' && latest.sourceUpdatedAt === listing.updatedAt) {
            return deps.socialPublicationToResponse(latest);
        }

        const publicUrl = deps.buildListingPublicUrl(listing);
        const caption = deps.buildListingCaption(
            listing,
            publicUrl,
            account.captionTemplate,
            options.captionOverride ?? null,
        );

        try {
            const result = videoUrl
                ? await publishFacebookPageVideo({
                    pageId: account.facebookPageId,
                    pageAccessToken: account.facebookPageAccessToken,
                    videoUrl,
                    message: caption,
                    link: publicUrl,
                })
                : await publishFacebookPageLinkPost({
                    pageId: account.facebookPageId,
                    pageAccessToken: account.facebookPageAccessToken,
                    message: caption,
                    link: publicUrl,
                    pictureUrl: deps.extractListingMediaUrls(listing)[0] ?? null,
                });

            const publication = await deps.createSocialPublicationRecord({
                userId: user.id,
                vertical: listing.vertical,
                listingId: listing.id,
                listingTitle: listing.title,
                platform: 'facebook',
                contentType,
                externalId: result.postId,
                permalink: result.permalink,
                caption,
                mediaUrl: videoUrl ?? deps.extractListingMediaUrls(listing)[0] ?? null,
                status: 'published',
                errorMessage: null,
                sourceUpdatedAt: listing.updatedAt,
                publishedAt: Date.now(),
            });

            await deps.updateInstagramAccountSettings(user.id, listing.vertical, {
                lastPublishedAt: Date.now(),
                lastError: null,
            });

            return deps.socialPublicationToResponse(publication);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo publicar en Facebook.';
            await deps.createSocialPublicationRecord({
                userId: user.id,
                vertical: listing.vertical,
                listingId: listing.id,
                listingTitle: listing.title,
                platform: 'facebook',
                contentType,
                externalId: null,
                permalink: null,
                caption,
                mediaUrl: videoUrl ?? deps.extractListingMediaUrls(listing)[0] ?? null,
                status: 'failed',
                errorMessage: message,
                sourceUpdatedAt: listing.updatedAt,
                publishedAt: null,
            });
            await deps.updateInstagramAccountSettings(user.id, listing.vertical, {
                lastError: message,
            });
            throw new Error(message);
        }
    };
}
