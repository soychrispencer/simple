import { apiFetch } from '@simple/utils';
import type {
  ConfirmCheckoutResponse,
  PaymentOrderStatus,
  PaymentOrderView,
  PaymentVertical,
  SubscriptionCatalogResponse,
  SubscriptionPlan,
  SubscriptionPlanId,
} from '@simple/utils';

export type {
  ConfirmCheckoutResponse,
  PaymentOrderStatus,
  PaymentOrderView,
  PaymentVertical,
  SubscriptionCatalogResponse,
  SubscriptionPlan,
  SubscriptionPlanId,
};

export async function fetchSubscriptionCatalog(): Promise<SubscriptionCatalogResponse | null> {
    const { data } = await apiFetch<SubscriptionCatalogResponse>('/api/subscriptions/catalog?vertical=serenatas', { method: 'GET' });
    return data?.ok ? data : null;
}

export async function startSubscriptionCheckout(input: { planId: 'essential' | 'pro'; returnUrl: string }): Promise<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string }> {
    const { data } = await apiFetch<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string }>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
            kind: 'subscription',
            vertical: 'serenatas',
            returnUrl: input.returnUrl,
            subscription: { planId: input.planId },
        }),
    });
    return data ?? { ok: false, error: 'No pudimos iniciar el checkout.' };
}

export async function startSerenataCheckout(input: { serenataId: string; returnUrl: string }): Promise<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string }> {
    const { data } = await apiFetch<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string }>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
            kind: 'serenata_booking',
            vertical: 'serenatas',
            returnUrl: input.returnUrl,
            serenata: { serenataId: input.serenataId },
        }),
    });
    return data ?? { ok: false, error: 'No pudimos iniciar el pago.' };
}

export async function confirmCheckout(input: { orderId: string; paymentId?: string | null }): Promise<{ ok: boolean; status?: PaymentOrderStatus; error?: string }> {
    const { data } = await apiFetch<{ ok: boolean; status?: PaymentOrderStatus; error?: string }>('/api/payments/confirm', {
        method: 'POST',
        body: JSON.stringify({
            orderId: input.orderId,
            ...(input.paymentId ? { paymentId: input.paymentId } : {}),
        }),
    });
    return data ?? { ok: false, error: 'No pudimos validar el pago.' };
}
