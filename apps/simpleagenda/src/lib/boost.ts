import {
    fetchFeaturedBoosted as fetchFeaturedBoostedForVertical,
    type FeaturedBoostItem as BaseFeaturedBoostItem,
} from '@simple/utils';

const VERTICAL = 'agenda';

export type BoostSection = 'marketplace' | 'landing';
export type FeaturedBoostItem = Omit<BaseFeaturedBoostItem, 'section'> & { section: BoostSection };

export function fetchFeaturedBoosted(section: BoostSection, limit = 8): Promise<FeaturedBoostItem[]> {
    return fetchFeaturedBoostedForVertical(VERTICAL, section, limit) as Promise<FeaturedBoostItem[]>;
}
