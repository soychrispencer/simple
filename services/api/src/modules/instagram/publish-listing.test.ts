import { describe, expect, it, vi } from 'vitest';
import { createPublishListingToInstagram, refreshInstagramAccountIfNeeded } from './publish-listing.js';
import type { InstagramAccountRecord } from './account-store.js';

describe('publish-listing', () => {
    it('rechaza publicación sin cuenta conectada', async () => {
        const publish = createPublishListingToInstagram({
            getInstagramAccount: () => null,
            userCanUseInstagram: () => true,
            getLatestInstagramPublicationForListing: () => null,
            instagramPublicationToResponse: (r) => r,
            refreshInstagramAccountIfNeeded: async (a) => a,
            buildListingPublicUrlForInstagram: () => 'https://example.com/l/1',
            extractListingMediaUrls: () => ['https://img/1.jpg'],
            extractListingVideoUrl: () => null,
            prepareInstagramImageUrl: async () => 'https://img/prepared.jpg',
            buildInstagramCaption: () => 'caption',
            logDebug: () => {},
            createInstagramPublicationRecord: async (input) => ({
                ...input,
                id: 'pub-1',
                accountId: null,
                contentType: input.contentType ?? 'carousel',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }),
            updateInstagramAccountSettings: async () => null,
        });

        await expect(
            publish(
                { id: 'u1', role: 'user' },
                { id: 'l1', vertical: 'autos', status: 'active', title: 'Test', updatedAt: 1 },
            ),
        ).rejects.toThrow(/conecta una cuenta/i);
    });

    it('refreshInstagramAccountIfNeeded no renueva token vigente', async () => {
        const account: InstagramAccountRecord = {
            id: 'a1',
            userId: 'u1',
            vertical: 'autos',
            instagramUserId: 'ig1',
            username: 'user',
            displayName: null,
            accountType: null,
            profilePictureUrl: null,
            accessToken: 'tok',
            tokenExpiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
            scopes: [],
            autoPublishEnabled: false,
            captionTemplate: null,
            publishStyle: null,
            status: 'connected',
            lastSyncedAt: null,
            lastPublishedAt: null,
            lastError: null,
            facebookPageId: null,
            facebookPageName: null,
            facebookPageAccessToken: null,
            createdAt: 1,
            updatedAt: 1,
        };
        const update = vi.fn();
        const result = await refreshInstagramAccountIfNeeded(account, update);
        expect(result).toBe(account);
        expect(update).not.toHaveBeenCalled();
    });
});
