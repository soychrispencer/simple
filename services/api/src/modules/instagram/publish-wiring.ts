import type { InstagramTemplateView as InstagramRenderTemplate } from './templates.js';
import type { ListingData as InstagramListingData } from './templates.js';
import {
    buildInstagramCaption as buildInstagramCaptionFromModule,
    buildInstagramListingData as buildInstagramListingDataFromModule,
    getInstagramBasePublicOrigin as getInstagramBasePublicOriginFromModule,
    buildListingPublicUrlForInstagram as buildListingPublicUrlForInstagramFromModule,
    prepareInstagramImageUrl as prepareInstagramImageUrlFromModule,
    type InstagramListingPresentationDeps,
} from './listing-presentation.js';
import {
    createPublishListingToInstagram,
    createMaybeAutoPublishListing,
    type PublishListingToInstagramDeps,
} from './publish-listing.js';
import {
    resolveInstagramPublishStyle,
    resolvePublishTemplateForListing,
} from './publish-preferences.js';
import type { InstagramAccountRecord } from './account-store.js';
import { getR2S3Client } from '../media/s3-clients.js';

export type InstagramPublishPresentationInput = {
    extractListingSummary: InstagramListingPresentationDeps['extractListingSummary'];
    extractListingMediaUrls: InstagramListingPresentationDeps['extractListingMediaUrls'];
    parseNumberFromString: InstagramListingPresentationDeps['parseNumberFromString'];
    listingDefaultHref: InstagramListingPresentationDeps['listingDefaultHref'];
    extractStorageObjectKey: InstagramListingPresentationDeps['extractStorageObjectKey'];
};

type PublishDepsBase = Omit<
    PublishListingToInstagramDeps,
    'buildInstagramCaption' | 'prepareInstagramImageUrl' | 'buildListingPublicUrlForInstagram'
>;

export function createInstagramPublishWiring(
    presentation: InstagramPublishPresentationInput,
    publishDepsBase: PublishDepsBase,
) {
    function getInstagramPresentationDeps(): InstagramListingPresentationDeps {
        return {
            extractListingSummary: (listing) => presentation.extractListingSummary(listing),
            extractListingMediaUrls: (listing) => presentation.extractListingMediaUrls(listing),
            parseNumberFromString: presentation.parseNumberFromString,
            listingDefaultHref: (vertical, listingId) =>
                presentation.listingDefaultHref(vertical, listingId),
            getR2S3Client,
            extractStorageObjectKey: presentation.extractStorageObjectKey,
        };
    }

    function buildInstagramCaption(
        listing: unknown,
        publicUrl: string,
        template: string | null,
        override: string | null,
    ): string {
        return buildInstagramCaptionFromModule(
            listing as Parameters<typeof buildInstagramCaptionFromModule>[0],
            publicUrl,
            template,
            override,
            getInstagramPresentationDeps(),
        );
    }

    function buildInstagramListingData(listing: unknown): InstagramListingData {
        return buildInstagramListingDataFromModule(
            listing as Parameters<typeof buildInstagramListingDataFromModule>[0],
            getInstagramPresentationDeps(),
        );
    }

    function getInstagramBasePublicOrigin(): string {
        return getInstagramBasePublicOriginFromModule();
    }

    function buildListingPublicUrlForInstagram(listing: unknown): string {
        return buildListingPublicUrlForInstagramFromModule(
            listing as Parameters<typeof buildListingPublicUrlForInstagramFromModule>[0],
            presentation.listingDefaultHref,
        );
    }

    async function prepareInstagramImageUrl(
        listing: unknown,
        index = 0,
        options: {
            layoutVariant?: 'square' | 'portrait' | null;
            template?: InstagramRenderTemplate | null;
            publishKey?: string | null;
            isCover?: boolean;
        } = {},
    ): Promise<string> {
        return prepareInstagramImageUrlFromModule(
            listing as Parameters<typeof prepareInstagramImageUrlFromModule>[0],
            getInstagramPresentationDeps(),
            index,
            options,
        );
    }

    const publishListingDeps: PublishListingToInstagramDeps = {
        ...publishDepsBase,
        buildListingPublicUrlForInstagram,
        prepareInstagramImageUrl,
        buildInstagramCaption,
        resolvePublishTemplate: (account: InstagramAccountRecord, listing) => {
            const style = resolveInstagramPublishStyle(account.publishStyle);
            const listingData = buildInstagramListingData(listing);
            return resolvePublishTemplateForListing(style, listingData);
        },
    };

    const publishListingToInstagram = createPublishListingToInstagram(publishListingDeps);

    const maybeAutoPublishListing = createMaybeAutoPublishListing({
        ...publishListingDeps,
        publishListingToInstagram,
    });

    return {
        buildInstagramCaption,
        buildInstagramListingData,
        getInstagramBasePublicOrigin,
        buildListingPublicUrlForInstagram,
        prepareInstagramImageUrl,
        publishListingToInstagram,
        maybeAutoPublishListing,
    };
}
