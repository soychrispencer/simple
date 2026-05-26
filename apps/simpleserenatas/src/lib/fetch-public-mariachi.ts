import {
    fetchMarketplaceGroupServer,
    type MarketplaceGroupData,
} from '@/lib/marketplace-group-fetch';

export type PublicMariachiProfile = MarketplaceGroupData;

export async function fetchPublicMariachiBySlug(slug: string): Promise<PublicMariachiProfile | null> {
    return fetchMarketplaceGroupServer(slug);
}
