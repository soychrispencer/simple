import type { SubscriptionPlanRecord, VerticalType } from '../advertising/types.js';

const TRIAL_BILLING_VERTICALS = new Set<VerticalType>(['agenda', 'serenatas']);

export function isTrialBillingVertical(vertical: VerticalType): boolean {
    return TRIAL_BILLING_VERTICALS.has(vertical);
}

export function filterCatalogPlans(vertical: VerticalType, plans: SubscriptionPlanRecord[]): SubscriptionPlanRecord[] {
    if (!isTrialBillingVertical(vertical)) return plans;
    return plans.filter((plan) => plan.id === 'free' || plan.id === 'pro');
}

export function catalogPaidPlans(vertical: VerticalType, plans: SubscriptionPlanRecord[]): SubscriptionPlanRecord[] {
    return filterCatalogPlans(vertical, plans).filter((plan) => plan.id !== 'free');
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
