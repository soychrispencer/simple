import {
    fetchFeaturedBoosted as fetchFeaturedBoostedForVertical,
    type FeaturedBoostItem,
} from '@simple/utils';

const VERTICAL = 'serenatas';

export type BoostSection = 'marketplace' | 'landing';

export function fetchFeaturedBoosted(section: BoostSection, limit = 12): Promise<FeaturedBoostItem[]> {
    return fetchFeaturedBoostedForVertical(VERTICAL, section, limit) as Promise<FeaturedBoostItem[]>;
}
