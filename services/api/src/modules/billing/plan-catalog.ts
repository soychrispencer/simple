import type { SubscriptionPlanRecord, VerticalType } from '../advertising/types.js';

const TRIAL_BILLING_VERTICALS = new Set<VerticalType>(['agenda', 'serenatas']);

export function isTrialBillingVertical(vertical: VerticalType): boolean {
    return TRIAL_BILLING_VERTICALS.has(vertical);
}

export type MarketplaceAccountKind = 'individual' | 'independent' | 'company';

/** Free is available to every segment; paid plans follow the active account segment. */
export function isMarketplacePlanAvailableForAccount(
    accountKind: MarketplaceAccountKind | undefined,
    planId: string,
): boolean {
    if (planId === 'free') return true;
    if (accountKind === 'individual') return false;
    if (accountKind === 'independent' && planId === 'enterprise') return false;
    return true;
}

export function filterCatalogPlans(
    vertical: VerticalType,
    plans: SubscriptionPlanRecord[],
    accountKind?: MarketplaceAccountKind,
): SubscriptionPlanRecord[] {
    if (vertical === 'autos' || vertical === 'propiedades') {
        return plans.filter((plan) => isMarketplacePlanAvailableForAccount(accountKind, plan.id));
    }
    if (isTrialBillingVertical(vertical)) {
        const visiblePlanIds = vertical === 'agenda'
            ? new Set(['free', 'pro', 'pro_plus', 'enterprise'])
            : new Set(['free', 'pro']);
        return plans.filter((plan) => visiblePlanIds.has(plan.id));
    }
    return plans;
}

export function catalogPaidPlans(
    vertical: VerticalType,
    plans: SubscriptionPlanRecord[],
    accountKind?: MarketplaceAccountKind,
): SubscriptionPlanRecord[] {
    return filterCatalogPlans(vertical, plans, accountKind).filter((plan) => plan.id !== 'free');
}

export function normalizeCatalogSubscription(
    vertical: VerticalType,
    subscription: Record<string, unknown> | null,
    plans: SubscriptionPlanRecord[],
): Record<string, unknown> | null {
    if (!subscription) return null;

    const planId = String(subscription.planId ?? 'free');
    const matched = plans.find((plan) => plan.id === planId);
    return {
        ...subscription,
        planId,
        planName: matched?.name ?? subscription.planName,
        features: matched?.features ?? subscription.features,
    };
}
