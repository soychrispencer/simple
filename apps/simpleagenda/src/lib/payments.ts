import {
    confirmCheckout,
    fetchSubscriptionCatalog as fetchSubscriptionCatalogForVertical,
    startAdvertisingCheckout as startAdvertisingCheckoutForVertical,
    startBoostCheckout as startBoostCheckoutForVertical,
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
    planId: 'pro' | 'pro_plus' | 'enterprise';
    billingCycle?: 'monthly' | 'annual';
    returnUrl: string;
};

export function fetchSubscriptionCatalog(): Promise<SubscriptionCatalogResponse | null> {
    return fetchSubscriptionCatalogForVertical(VERTICAL);
}

export type AgendaTrialStatus = {
    state: 'available' | 'active' | 'used';
    endsAt: string | null;
    remainingDays: number | null;
    canManage: boolean;
};

export async function fetchAgendaTrialStatus(): Promise<AgendaTrialStatus | null> {
    const { apiFetch } = await import('@simple/utils');
    const { data } = await apiFetch<{ ok: boolean; trial?: AgendaTrialStatus }>('/api/agenda/subscription/trial');
    return data?.ok ? data.trial ?? null : null;
}

export async function activateAgendaTrial(): Promise<{ ok: boolean; error?: string }> {
    const { apiFetch } = await import('@simple/utils');
    const { data } = await apiFetch<{ ok: boolean; error?: string }>('/api/agenda/subscription/trial/activate', {
        method: 'POST',
    });
    return data ?? { ok: false, error: 'No pudimos activar la prueba Pro.' };
}

export function startSubscriptionCheckout(
    input: CheckoutStartInput,
): ReturnType<typeof startSubscriptionCheckoutForVertical> {
    return startSubscriptionCheckoutForVertical(VERTICAL, {
        returnUrl: input.returnUrl,
        planId: input.planId,
        billingCycle: input.billingCycle,
    });
}

export function startBoostCheckout(
    input: Parameters<typeof startBoostCheckoutForVertical>[1],
): ReturnType<typeof startBoostCheckoutForVertical> {
    return startBoostCheckoutForVertical(VERTICAL, input);
}

export function startAdvertisingCheckout(
    input: Parameters<typeof startAdvertisingCheckoutForVertical>[1],
): ReturnType<typeof startAdvertisingCheckoutForVertical> {
    return startAdvertisingCheckoutForVertical(VERTICAL, input);
}

export { confirmCheckout };

export async function cancelSubscription(): Promise<{ ok: boolean; error?: string; message?: string }> {
    const { apiFetch } = await import('@simple/utils');
    const { data } = await apiFetch<{ ok: boolean; error?: string; message?: string }>('/api/agenda/subscription/cancel', {
        method: 'POST',
    });
    return data ?? { ok: false, error: 'No pudimos cancelar la suscripción.' };
}
