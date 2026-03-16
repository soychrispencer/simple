const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ApiResponse<T> = {
    status: number;
    data: T | null;
};

export type PaymentOrderStatus = 'pending' | 'approved' | 'authorized' | 'rejected' | 'cancelled';
export type AdFormat = 'hero' | 'card' | 'inline';
export type AdDurationDays = 7 | 15 | 30;
export type BoostSection = 'sale' | 'rent' | 'project';
export type BoostPlanId = 'boost_starter' | 'boost_pro' | 'boost_max';
export type SubscriptionPlanId = 'free' | 'basic' | 'pro' | 'enterprise';

export type PaymentOrderView = {
    id: string;
    vertical: 'autos' | 'propiedades';
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
    features: string[];
};

export type ActiveSubscription = {
    id: string;
    vertical: 'autos' | 'propiedades';
    planId: 'basic' | 'pro' | 'enterprise';
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

type ConfirmCheckoutResponse = {
    ok: boolean;
    status?: PaymentOrderStatus;
    order?: PaymentOrderView;
    boostOrder?: unknown;
    subscription?: ActiveSubscription | null;
    error?: string;
};

type SubscriptionCatalogResponse = {
    ok: boolean;
    vertical: 'autos' | 'propiedades';
    mercadoPagoEnabled: boolean;
    plans: SubscriptionPlan[];
    freePlan: SubscriptionPlan | null;
    currentSubscription: ActiveSubscription | null;
    orders: PaymentOrderView[];
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
            ...init,
        });

        const data = (await response.json().catch(() => null)) as T | null;
        return { status: response.status, data };
    } catch {
        return { status: 0, data: null };
    }
}

export async function startBoostCheckout(input: {
    returnUrl: string;
    listingId: string;
    section: BoostSection;
    planId: BoostPlanId;
}): Promise<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string }> {
    const { data } = await apiRequest<StartCheckoutResponse>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
            kind: 'boost',
            vertical: 'propiedades',
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

export async function startAdvertisingCheckout(input: {
    returnUrl: string;
    campaignId: string;
}): Promise<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string }> {
    const { data } = await apiRequest<StartCheckoutResponse>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
            kind: 'advertising',
            vertical: 'propiedades',
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

export async function startSubscriptionCheckout(input: {
    returnUrl: string;
    planId: 'basic' | 'pro' | 'enterprise';
}): Promise<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string }> {
    const { data } = await apiRequest<StartCheckoutResponse>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
            kind: 'subscription',
            vertical: 'propiedades',
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
    const { data } = await apiRequest<ConfirmCheckoutResponse>('/api/payments/confirm', {
        method: 'POST',
        body: JSON.stringify({
            orderId: input.orderId,
            ...(input.paymentId ? { paymentId: input.paymentId } : {}),
        }),
    });

    return data ?? { ok: false, error: 'No pudimos validar el pago.' };
}

export async function fetchSubscriptionCatalog(): Promise<SubscriptionCatalogResponse | null> {
    const { data } = await apiRequest<SubscriptionCatalogResponse>('/api/subscriptions/catalog?vertical=propiedades', {
        method: 'GET',
    });
    return data?.ok ? data : null;
}
