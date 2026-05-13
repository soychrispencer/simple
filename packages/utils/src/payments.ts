import { apiFetch } from './api-client.js';

export type PaymentVertical = 'autos' | 'propiedades';
export type PaymentOrderStatus = 'pending' | 'approved' | 'authorized' | 'rejected' | 'cancelled';
export type AdFormat = 'hero' | 'card' | 'inline';
export type AdDurationDays = 7 | 15 | 30;
export type PaymentBoostSection = 'sale' | 'rent' | 'auction' | 'project';
export type PaymentBoostPlanId = 'boost_starter' | 'boost_pro' | 'boost_max';
export type SubscriptionPlanId = 'free' | 'pro' | 'enterprise';

export type PaymentOrderView = {
    id: string;
    vertical: PaymentVertical;
    kind: 'boost' | 'advertising' | 'subscription';
    title: string;
    amount: number;
    currency: 'CLP';
    status: PaymentOrderStatus;
    providerStatus: string | null;
    providerReferenceId: string | null;
    createdAt: number;
    updatedAt: number;
    appliedAt: number | null;
    appliedResourceId: string | null;
    metadata: Record<string, unknown>;
};

export type SubscriptionPlan = {
    id: SubscriptionPlanId;
    name: string;
    description: string;
    priceMonthly: number;
    currency: 'CLP';
    maxListings: number;
    maxFeaturedListings: number;
    maxImagesPerListing: number;
    analyticsEnabled: boolean;
    crmEnabled: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    recommended?: boolean;
    isComingSoon?: boolean;
    features: string[];
};

export type ActiveSubscription = {
    id: string;
    vertical: PaymentVertical;
    planId: 'pro' | 'enterprise';
    planName: string;
    priceMonthly: number;
    currency: 'CLP';
    features: string[];
    status: 'active' | 'cancelled' | 'paused';
    providerStatus: string | null;
    startedAt: number;
    updatedAt: number;
};

type StartCheckoutResponse = {
    ok: boolean;
    orderId?: string;
    checkoutUrl?: string | null;
    order?: PaymentOrderView;
    error?: string;
};

export type ConfirmCheckoutResponse = {
    ok: boolean;
    status?: PaymentOrderStatus;
    order?: PaymentOrderView;
    boostOrder?: unknown;
    subscription?: ActiveSubscription | null;
    error?: string;
};

export type SubscriptionCatalogResponse = {
    ok: boolean;
    vertical: PaymentVertical;
    mercadoPagoEnabled: boolean;
    plans: SubscriptionPlan[];
    freePlan: SubscriptionPlan | null;
    currentSubscription: ActiveSubscription | null;
    orders: PaymentOrderView[];
};

export async function startBoostCheckout(
    vertical: PaymentVertical,
    input: {
        returnUrl: string;
        listingId: string;
        section: PaymentBoostSection;
        planId: PaymentBoostPlanId;
    }
): Promise<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string }> {
    const { data } = await apiFetch<StartCheckoutResponse>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
            kind: 'boost',
            vertical,
            returnUrl: input.returnUrl,
            boost: {
                listingId: input.listingId,
                section: input.section,
                planId: input.planId,
            },
        }),
    });

    return {
        ok: Boolean(data?.ok && data.checkoutUrl),
        orderId: data?.orderId,
        checkoutUrl: data?.checkoutUrl,
        error: data?.error ?? (!data?.checkoutUrl ? 'No pudimos iniciar el checkout.' : undefined),
    };
}

export async function startAdvertisingCheckout(
    vertical: PaymentVertical,
    input: {
        returnUrl: string;
        campaignId: string;
    }
): Promise<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string }> {
    const { data } = await apiFetch<StartCheckoutResponse>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
            kind: 'advertising',
            vertical,
            returnUrl: input.returnUrl,
            advertising: {
                campaignId: input.campaignId,
            },
        }),
    });

    return {
        ok: Boolean(data?.ok && data.checkoutUrl),
        orderId: data?.orderId,
        checkoutUrl: data?.checkoutUrl,
        error: data?.error ?? (!data?.checkoutUrl ? 'No pudimos iniciar el checkout.' : undefined),
    };
}

export async function startSubscriptionCheckout(
    vertical: PaymentVertical,
    input: {
        returnUrl: string;
        planId: 'pro' | 'enterprise';
    }
): Promise<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string }> {
    const { data } = await apiFetch<StartCheckoutResponse>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
            kind: 'subscription',
            vertical,
            returnUrl: input.returnUrl,
            subscription: {
                planId: input.planId,
            },
        }),
    });

    return {
        ok: Boolean(data?.ok && data.checkoutUrl),
        orderId: data?.orderId,
        checkoutUrl: data?.checkoutUrl,
        error: data?.error ?? (!data?.checkoutUrl ? 'No pudimos iniciar el checkout.' : undefined),
    };
}

export async function confirmCheckout(input: {
    orderId: string;
    paymentId?: string | null;
}): Promise<ConfirmCheckoutResponse> {
    const { data } = await apiFetch<ConfirmCheckoutResponse>('/api/payments/confirm', {
        method: 'POST',
        body: JSON.stringify({
            orderId: input.orderId,
            ...(input.paymentId ? { paymentId: input.paymentId } : {}),
        }),
    });

    return data ?? { ok: false, error: 'No pudimos validar el pago.' };
}

export async function fetchSubscriptionCatalog(vertical: PaymentVertical): Promise<SubscriptionCatalogResponse | null> {
    const { data } = await apiFetch<SubscriptionCatalogResponse>(`/api/subscriptions/catalog?vertical=${vertical}`, {
        method: 'GET',
    });
    return data?.ok ? data : null;
}
