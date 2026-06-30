'use client';

import { useEffect, useState } from 'react';
import {
    fetchMyMarketplaceListingCount,
    fetchSubscriptionCatalog,
    type PublicProfileVertical,
} from '@simple/utils';
import { resolveMarketplacePlanBannerState } from './marketplace-plan-banner-state.js';

export type MarketplacePublishPlanLimitState = {
    loading: boolean;
    listingCount: number;
    maxListings: number;
    planLabel: string;
    atLimit: boolean;
    nearLimit: boolean;
    slotsRemaining: number | null;
};

const EMPTY_STATE: MarketplacePublishPlanLimitState = {
    loading: true,
    listingCount: 0,
    maxListings: 3,
    planLabel: 'Gratuito',
    atLimit: false,
    nearLimit: false,
    slotsRemaining: null,
};

export function useMarketplacePublishPlanLimit(
    vertical: PublicProfileVertical,
    subscriptionHref = '/panel/mi-cuenta/suscripcion',
): MarketplacePublishPlanLimitState {
    const [state, setState] = useState<MarketplacePublishPlanLimitState>(EMPTY_STATE);

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            const [catalog, listingCount] = await Promise.all([
                fetchSubscriptionCatalog(vertical),
                fetchMyMarketplaceListingCount(vertical),
            ]);
            if (cancelled) return;

            const planState = resolveMarketplacePlanBannerState(catalog, subscriptionHref);
            const { maxListings } = planState;
            const unlimited = maxListings < 0;
            const atLimit = !unlimited && listingCount >= maxListings;
            const slotsRemaining = unlimited ? null : Math.max(0, maxListings - listingCount);
            const nearLimit = !unlimited && !atLimit && listingCount >= Math.max(1, maxListings - 1);

            setState({
                loading: false,
                listingCount,
                maxListings,
                planLabel: planState.planLabel,
                atLimit,
                nearLimit,
                slotsRemaining,
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [vertical, subscriptionHref]);

    return state;
}

export function isMarketplacePublishBlockedByPlan(
    planLimit: Pick<MarketplacePublishPlanLimitState, 'loading' | 'atLimit'>,
    isEditing: boolean,
): boolean {
    if (isEditing || planLimit.loading) return false;
    return planLimit.atLimit;
}
