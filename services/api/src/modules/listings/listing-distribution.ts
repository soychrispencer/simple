import type { InstagramPublicationRecord, SocialPublicationRecord } from '../../lib/domain-types.js';
import type { VerticalType } from '@simple/types';
import type { ListingRecord } from './persist.js';
import { getPortalSyncView } from './panel-present.js';
import { getAvailablePortals } from './portals.js';

export type ListingDistributionChannel = {
    key: string;
    label: string;
    kind: 'simple' | 'portal' | 'social';
    status: 'published' | 'ready' | 'missing' | 'failed';
    publishedAt: number | null;
    permalink: string | null;
    contentType?: string | null;
    manual?: boolean;
    lastError?: string | null;
    canTrack?: boolean;
};

function simpleBrandLabel(vertical: VerticalType): string {
    return vertical === 'autos' ? 'SimpleAutos' : 'SimplePropiedades';
}

function simpleChannelStatus(listing: ListingRecord): ListingDistributionChannel['status'] {
    if (listing.status === 'active') return 'published';
    if (listing.status === 'draft') return 'missing';
    if (listing.status === 'sold' || listing.status === 'archived') return 'ready';
    return 'ready';
}

export function buildListingDistribution(input: {
    listing: ListingRecord;
    instagramPublications: InstagramPublicationRecord[];
    socialPublications: SocialPublicationRecord[];
}): ListingDistributionChannel[] {
    const { listing } = input;
    const channels: ListingDistributionChannel[] = [];

    channels.push({
        key: 'simple',
        label: simpleBrandLabel(listing.vertical as VerticalType),
        kind: 'simple',
        status: simpleChannelStatus(listing),
        publishedAt: listing.status === 'active' ? listing.updatedAt : null,
        permalink: listing.href || null,
        canTrack: false,
    });

    for (const portal of getAvailablePortals(listing.vertical as VerticalType)) {
        const view = getPortalSyncView(listing, portal);
        const stored = listing.integrations[portal];
        channels.push({
            key: `portal:${portal}`,
            label: view.label,
            kind: 'portal',
            status: view.status,
            publishedAt: view.publishedAt,
            permalink: stored?.externalUrl ?? null,
            manual: portal === 'facebook',
            lastError: view.lastError,
            canTrack: portal === 'facebook',
        });
    }

    const igPublished = input.instagramPublications.filter(
        (item) => item.listingId === listing.id && item.status === 'published',
    );
    for (const contentType of ['carousel', 'reel'] as const) {
        const publication = igPublished.find((item) => item.contentType === contentType);
        channels.push({
            key: contentType === 'reel' ? 'instagram_reel' : 'instagram_carousel',
            label: contentType === 'reel' ? 'Instagram · Reel' : 'Instagram · Fotos',
            kind: 'social',
            status: publication ? 'published' : 'ready',
            publishedAt: publication?.publishedAt ?? null,
            permalink: publication?.instagramPermalink ?? null,
            contentType,
            canTrack: false,
        });
    }

    const socialPublished = input.socialPublications.filter(
        (item) => item.listingId === listing.id && item.status === 'published',
    );
    const socialLabels: Record<'facebook' | 'tiktok' | 'youtube', string> = {
        facebook: 'Facebook · Página',
        tiktok: 'TikTok',
        youtube: 'YouTube Shorts',
    };
    for (const platform of ['facebook', 'tiktok', 'youtube'] as const) {
        const publication = socialPublished.find((item) => item.platform === platform);
        channels.push({
            key: platform,
            label: socialLabels[platform],
            kind: 'social',
            status: publication ? 'published' : 'ready',
            publishedAt: publication?.publishedAt ?? null,
            permalink: publication?.permalink ?? null,
            canTrack: false,
        });
    }

    return channels;
}
