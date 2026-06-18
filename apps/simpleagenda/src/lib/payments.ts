import {
    confirmCheckout,
    fetchSubscriptionCatalog as fetchSubscriptionCatalogForVertical,
    startSubscriptionCheckout as startSubscriptionCheckoutForVertical,
    type ConfirmCheckoutResponse,
    type PaymentOrderStatus,
    type PaymentOrderView,
    type PaymentVertical,
    type SubscriptionCatalogResponse,
    type SubscriptionPlan,
    type SubscriptionPlanId,
} from '@simple/utils';

const VERTICAL = 'agenda';

export type {
    ConfirmCheckoutResponse,
    PaymentOrderStatus,
    PaymentOrderView,
    PaymentVertical,
    SubscriptionCatalogResponse,
    SubscriptionPlan,
    SubscriptionPlanId,
};

export type CheckoutStartInput = {
    planId: 'pro';
    returnUrl: string;
};

export function fetchSubscriptionCatalog(): Promise<SubscriptionCatalogResponse | null> {
    return fetchSubscriptionCatalogForVertical(VERTICAL);
}

export function startSubscriptionCheckout(
    input: CheckoutStartInput,
): ReturnType<typeof startSubscriptionCheckoutForVertical> {
    return startSubscriptionCheckoutForVertical(VERTICAL, {
        returnUrl: input.returnUrl,
        planId: input.planId,
    });
}

export { confirmCheckout };

export async function cancelSubscription(): Promise<{ ok: boolean; error?: string; message?: string }> {
    const { apiFetch } = await import('@simple/utils');
    const { data } = await apiFetch<{ ok: boolean; error?: string; message?: string }>('/api/payments/cancel', {
        method: 'POST',
        body: JSON.stringify({ vertical: VERTICAL }),
    });
    return data ?? { ok: false, error: 'No pudimos cancelar la suscripción.' };
}
