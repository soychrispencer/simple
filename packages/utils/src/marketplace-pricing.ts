/**
 * Tarifas marketplace (boost + campañas).
 * Referencia competencia Chile: resaltadores Yapo desde ~$15.000/30 días.
 */

import type { AdvertisingVertical } from './marketplace-advertising-config.js';

export type MarketplaceAdDuration = 7 | 15 | 30;
export type MarketplaceAdFormat = 'hero' | 'card' | 'inline';
export type MarketplaceBoostPlan = 'boost_starter' | 'boost_pro' | 'boost_max';
export type MarketplaceListingBoostSection = 'sale' | 'rent' | 'auction' | 'project';
export type MarketplaceOperatorBoostSection = 'marketplace' | 'landing';
export type MarketplaceBoostSection = MarketplaceListingBoostSection | MarketplaceOperatorBoostSection;
export type MarketplacePricingVertical = AdvertisingVertical;

const zeroListingSection = {
    sale: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    rent: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    auction: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    project: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
} as const;

const operatorBoostPricing = {
    marketplace: { boost_starter: 2490, boost_pro: 4490, boost_max: 7990 },
    landing: { boost_starter: 3490, boost_pro: 5990, boost_max: 9990 },
} as const;

/** Boost: listings (autos/prop) y operadores (agenda/serenatas). */
export const MARKETPLACE_BOOST_PRICING: Record<
    MarketplacePricingVertical,
    Record<string, Record<MarketplaceBoostPlan, number>>
> = {
    propiedades: {
        sale: { boost_starter: 2990, boost_pro: 4990, boost_max: 7990 },
        rent: { boost_starter: 1990, boost_pro: 3490, boost_max: 5490 },
        project: { boost_starter: 7990, boost_pro: 12990, boost_max: 19990 },
        auction: zeroListingSection.auction,
    },
    autos: {
        sale: { boost_starter: 3990, boost_pro: 6990, boost_max: 11990 },
        rent: { boost_starter: 3490, boost_pro: 5990, boost_max: 9990 },
        auction: { boost_starter: 7990, boost_pro: 13990, boost_max: 21990 },
        project: zeroListingSection.project,
        products: { boost_starter: 2490, boost_pro: 4490, boost_max: 7990 },
        services: { boost_starter: 2490, boost_pro: 4490, boost_max: 7990 },
    },
    serenatas: operatorBoostPricing,
    agenda: operatorBoostPricing,
};

/** Campañas display (hero / card / inline). */
export const MARKETPLACE_AD_PRICING: Record<
    MarketplacePricingVertical,
    Record<MarketplaceAdFormat, Record<MarketplaceAdDuration, number>>
> = {
    autos: {
        hero: { 7: 14990, 15: 24990, 30: 39990 },
        card: { 7: 4990, 15: 7990, 30: 12990 },
        inline: { 7: 2990, 15: 4990, 30: 7990 },
    },
    propiedades: {
        hero: { 7: 14990, 15: 24990, 30: 39990 },
        card: { 7: 4990, 15: 7990, 30: 12990 },
        inline: { 7: 2990, 15: 4990, 30: 7990 },
    },
    serenatas: {
        hero: { 7: 9990, 15: 16990, 30: 24990 },
        card: { 7: 3990, 15: 6490, 30: 9990 },
        inline: { 7: 2490, 15: 3990, 30: 6490 },
    },
    agenda: {
        hero: { 7: 9990, 15: 16990, 30: 24990 },
        card: { 7: 3990, 15: 6490, 30: 9990 },
        inline: { 7: 2490, 15: 3990, 30: 6490 },
    },
};

export function getMarketplaceBoostPrice(
    vertical: MarketplacePricingVertical,
    section: string,
    planId: MarketplaceBoostPlan,
): number {
    return MARKETPLACE_BOOST_PRICING[vertical][section]?.[planId] ?? 0;
}
