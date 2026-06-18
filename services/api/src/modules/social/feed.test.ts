import { describe, expect, it } from 'vitest';
import { buildSocialFeedClips, extractListingDiscoverVideoUrl } from './feed.js';
import type { SocialFeedDeps, SocialFeedListingRecord } from './feed.js';

function makeListing(overrides: Partial<SocialFeedListingRecord> & { rawData?: unknown }): SocialFeedListingRecord {
    return {
        id: 'listing-1',
        vertical: 'autos',
        section: 'sale',
        href: '/vehiculo/listing-1',
        title: 'Toyota Corolla',
        price: '$10.000.000',
        location: 'Santiago',
        ownerId: 'user-1',
        views: 10,
        favs: 2,
        updatedAt: Date.now(),
        rawData: {},
        ...overrides,
    };
}

const baseDeps: SocialFeedDeps = {
    listingsById: new Map(),
    getActiveFeaturedListingIds: () => new Set(),
    isPublicListingVisible: () => true,
    extractListingMediaUrls: () => ['https://cdn.example/photo.jpg'],
    publicSectionLabel: () => 'Venta',
};

describe('social feed', () => {
    it('extractListingDiscoverVideoUrl lee videoUrl y discoverVideo', () => {
        const fromVideoUrl = makeListing({
            rawData: { media: { videoUrl: 'https://cdn.example/reel.mp4', photos: [] } },
        });
        expect(extractListingDiscoverVideoUrl(fromVideoUrl)).toBe('https://cdn.example/reel.mp4');

        const fromDiscover = makeListing({
            rawData: {
                media: {
                    discoverVideo: { dataUrl: 'https://cdn.example/discover.mp4' },
                    photos: [],
                },
            },
        });
        expect(extractListingDiscoverVideoUrl(fromDiscover)).toBe('https://cdn.example/discover.mp4');
    });

    it('buildSocialFeedClips solo devuelve avisos con video', () => {
        const withVideo = makeListing({
            id: 'with-video',
            rawData: { media: { videoUrl: 'https://cdn.example/a.mp4', photos: [] } },
        });
        const withoutVideo = makeListing({
            id: 'no-video',
            rawData: { media: { photos: [{ dataUrl: 'https://cdn.example/p.jpg' }] } },
        });

        const deps: SocialFeedDeps = {
            ...baseDeps,
            listingsById: new Map([
                [withVideo.id, withVideo],
                [withoutVideo.id, withoutVideo],
            ]),
        };

        const clips = buildSocialFeedClips(deps, 'autos', 'todos');
        expect(clips).toHaveLength(1);
        expect(clips[0]?.id).toBe('with-video');
        expect(clips[0]?.mediaType).toBe('video');
    });
});
