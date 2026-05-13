import {
    activateFreeBoost as activateFreeBoostForVertical,
    createBoostOrder as createBoostOrderForVertical,
    fetchBoostCatalog as fetchBoostCatalogForVertical,
    fetchBoostOrders as fetchBoostOrdersForVertical,
    fetchFeaturedBoosted as fetchFeaturedBoostedForVertical,
    getBoostSectionMeta,
    updateBoostOrderStatus,
    type BoostCatalogResponse as BaseBoostCatalogResponse,
    type BoostListing as BaseBoostListing,
    type BoostOrder as BaseBoostOrder,
    type BoostOrderStatus,
    type BoostPlan,
    type BoostPlanId,
    type FeaturedBoostItem as BaseFeaturedBoostItem,
    type FreeBoostQuota,
} from '@simple/utils';

const VERTICAL = 'propiedades';

export type BoostSection = 'sale' | 'rent' | 'project';
export type BoostListing = Omit<BaseBoostListing, 'section'> & { section: BoostSection };
export type BoostOrder = Omit<BaseBoostOrder, 'section' | 'listing'> & {
    section: BoostSection;
    listing?: BoostListing | null;
};
export type FeaturedBoostItem = Omit<BaseFeaturedBoostItem, 'section'> & { section: BoostSection };
export type BoostCatalogResponse = Omit<BaseBoostCatalogResponse, 'sections' | 'listings' | 'plansBySection' | 'reserved'> & {
    sections: BoostSection[];
    listings: BoostListing[];
    plansBySection: Partial<Record<BoostSection, BoostPlan[]>>;
    reserved: Partial<Record<BoostSection, { used: number; max: number }>>;
};

export type {
    BoostOrderStatus,
    BoostPlan,
    BoostPlanId,
    FreeBoostQuota,
};

export const BOOST_SECTION_META = getBoostSectionMeta(VERTICAL);

export function fetchBoostCatalog(): Promise<BoostCatalogResponse | null> {
    return fetchBoostCatalogForVertical(VERTICAL) as Promise<BoostCatalogResponse | null>;
}

export function fetchBoostOrders(): Promise<BoostOrder[]> {
    return fetchBoostOrdersForVertical(VERTICAL) as Promise<BoostOrder[]>;
}

export function createBoostOrder(input: {
    listingId: string;
    section: BoostSection;
    planId: BoostPlanId;
}): ReturnType<typeof createBoostOrderForVertical> {
    return createBoostOrderForVertical(VERTICAL, input);
}

export function activateFreeBoost(input: {
    listingId: string;
    section: BoostSection;
    planId: BoostPlanId;
}): ReturnType<typeof activateFreeBoostForVertical> {
    return activateFreeBoostForVertical(VERTICAL, input);
}

export { updateBoostOrderStatus };

export function fetchFeaturedBoosted(section: BoostSection, limit = 8): Promise<FeaturedBoostItem[]> {
    return fetchFeaturedBoostedForVertical(VERTICAL, section, limit) as Promise<FeaturedBoostItem[]>;
}
