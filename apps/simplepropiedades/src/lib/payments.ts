import {
    confirmCheckout,
    fetchSubscriptionCatalog as fetchSubscriptionCatalogForVertical,
    startAdvertisingCheckout as startAdvertisingCheckoutForVertical,
    startBoostCheckout as startBoostCheckoutForVertical,
    startSubscriptionCheckout as startSubscriptionCheckoutForVertical,
    type ActiveSubscription,
    type AdDurationDays,
    type AdFormat,
    type ConfirmCheckoutResponse,
    type PaymentBoostPlanId as BoostPlanId,
    type PaymentBoostSection as BoostSection,
    type PaymentOrderStatus,
    type PaymentOrderView,
    type SubscriptionCatalogResponse,
    type SubscriptionPlan,
    type SubscriptionPlanId,
} from '@simple/utils';

const VERTICAL = 'propiedades';

export type {
    ActiveSubscription,
    AdDurationDays,
    AdFormat,
    BoostPlanId,
    BoostSection,
    ConfirmCheckoutResponse,
    PaymentOrderStatus,
    PaymentOrderView,
    SubscriptionCatalogResponse,
    SubscriptionPlan,
    SubscriptionPlanId,
};

export function startBoostCheckout(
    input: Parameters<typeof startBoostCheckoutForVertical>[1]
): ReturnType<typeof startBoostCheckoutForVertical> {
    return startBoostCheckoutForVertical(VERTICAL, input);
}

export function startAdvertisingCheckout(
    input: Parameters<typeof startAdvertisingCheckoutForVertical>[1]
): ReturnType<typeof startAdvertisingCheckoutForVertical> {
    return startAdvertisingCheckoutForVertical(VERTICAL, input);
}

export function startSubscriptionCheckout(
    input: Parameters<typeof startSubscriptionCheckoutForVertical>[1]
): ReturnType<typeof startSubscriptionCheckoutForVertical> {
    return startSubscriptionCheckoutForVertical(VERTICAL, input);
}

export { confirmCheckout };

export function fetchSubscriptionCatalog(): Promise<SubscriptionCatalogResponse | null> {
    return fetchSubscriptionCatalogForVertical(VERTICAL);
}
