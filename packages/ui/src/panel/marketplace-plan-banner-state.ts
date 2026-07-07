import type { SubscriptionCatalogResponse } from '@simple/utils';
import { isMarketplaceLaunchActive } from '@simple/utils';
import { resolvePanelBillingFromCatalog, type PanelBillingAccess } from './business-setup.js';

export type MarketplacePlanBannerState = {
    billing: PanelBillingAccess;
    planLabel: string;
    maxListings: number;
    trialDaysRemaining: number | null;
    launchMode?: boolean;
};

export function resolveMarketplacePlanBannerState(
    catalog: SubscriptionCatalogResponse | null,
    subscriptionHref: string,
): MarketplacePlanBannerState {
    const vertical = catalog?.vertical;
    if (vertical && isMarketplaceLaunchActive(vertical)) {
        const billing = resolvePanelBillingFromCatalog(catalog, subscriptionHref);
        return {
            billing,
            planLabel: 'Lanzamiento',
            maxListings: -1,
            trialDaysRemaining: null,
            launchMode: true,
        };
    }

    const billing = resolvePanelBillingFromCatalog(catalog, subscriptionHref);
    const sub = catalog?.currentSubscription;
    const freeMax = catalog?.freePlan?.maxListings ?? 3;
    const proPlan = catalog?.plans.find((plan) => plan.id === 'pro');
    const paidMax = proPlan?.maxListings ?? 50;

    let planLabel = catalog?.freePlan?.name ?? 'Gratuito';
    let maxListings = freeMax;

    if (billing.status === 'pro') {
        planLabel = sub?.planName ?? 'Pro';
        maxListings = sub?.planId === 'enterprise' ? -1 : paidMax;
    } else if (billing.status === 'expired') {
        planLabel = 'Gratuito';
        maxListings = freeMax;
    } else if (sub?.planId === 'enterprise') {
        planLabel = sub.planName ?? 'Enterprise';
        maxListings = -1;
    }

    return {
        billing,
        planLabel,
        maxListings,
        trialDaysRemaining: billing.status === 'trial' ? billing.daysRemaining : null,
    };
}
