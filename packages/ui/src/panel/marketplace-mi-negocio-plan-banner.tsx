'use client';

import { useEffect, useState } from 'react';
import {
    fetchMyMarketplaceListingCount,
    fetchSubscriptionCatalog,
    type PublicProfileVertical,
} from '@simple/utils';
import { PanelMarketplacePlanBanner } from './panel-marketplace-plan-banner.js';
import { resolveMarketplacePlanBannerState } from './marketplace-plan-banner-state.js';

export type MarketplaceMiNegocioPlanBannerProps = {
    vertical: PublicProfileVertical;
    subscriptionHref?: string;
    miNegocioHref?: string;
};

export function MarketplaceMiNegocioPlanBanner({
    vertical,
    subscriptionHref = '/panel/mi-cuenta/suscripcion',
    miNegocioHref = '/panel/mi-negocio',
}: MarketplaceMiNegocioPlanBannerProps) {
    const [loading, setLoading] = useState(true);
    const [listingCount, setListingCount] = useState(0);
    const [planState, setPlanState] = useState(() => resolveMarketplacePlanBannerState(null, subscriptionHref));

    useEffect(() => {
        void (async () => {
            const [catalog, count] = await Promise.all([
                fetchSubscriptionCatalog(vertical),
                fetchMyMarketplaceListingCount(vertical),
            ]);
            setPlanState(resolveMarketplacePlanBannerState(catalog, subscriptionHref));
            setListingCount(count);
            setLoading(false);
        })();
    }, [vertical, subscriptionHref]);

    return (
        <PanelMarketplacePlanBanner
            loading={loading}
            listingCount={listingCount}
            maxListings={planState.maxListings}
            planLabel={planState.planLabel}
            billingStatus={planState.billing.status}
            trialDaysRemaining={planState.trialDaysRemaining}
            subscriptionHref={subscriptionHref}
            miNegocioHref={miNegocioHref}
            launchMode={planState.launchMode}
        />
    );
}
