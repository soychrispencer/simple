export type ListingDistributionChannelKind = 'simple' | 'portal' | 'social';

export type ListingDistributionChannelStatus = 'published' | 'ready' | 'missing' | 'failed';

export type ListingDistributionChannel = {
    key: string;
    label: string;
    kind: ListingDistributionChannelKind;
    status: ListingDistributionChannelStatus;
    publishedAt: number | null;
    permalink: string | null;
    contentType?: string | null;
    manual?: boolean;
    lastError?: string | null;
    canTrack?: boolean;
};
