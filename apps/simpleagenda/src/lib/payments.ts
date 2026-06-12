import { API_BASE } from '@simple/config';
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

export type CheckoutStartInput = {
  planId: 'essential' | 'pro';
  returnUrl: string;
};

export type CheckoutStartResponse = {
  ok: boolean;
  error?: string;
  orderId?: string;
  checkoutUrl?: string | null;
  status?: string;
};

export type CheckoutConfirmInput = {
  orderId?: string;
  paymentId?: string | null;
  preapprovalId?: string;
  status?: PaymentOrderStatus;
};

export type CheckoutConfirmResponse = {
  ok: boolean;
  error?: string;
  status?: PaymentOrderStatus;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchSubscriptionCatalog(): Promise<SubscriptionCatalogResponse | null> {
  try {
    return await request<SubscriptionCatalogResponse>(
      `/api/subscriptions/catalog?vertical=agenda`
    );
  } catch (error) {
    console.error('Error fetching subscription catalog:', error);
    return null;
  }
}

export async function startSubscriptionCheckout(
  input: CheckoutStartInput
): Promise<CheckoutStartResponse> {
  return request<CheckoutStartResponse>('/api/payments/checkout', {
    method: 'POST',
    body: JSON.stringify({
      kind: 'subscription',
      vertical: 'agenda',
      returnUrl: input.returnUrl,
      subscription: {
        planId: input.planId,
      },
    }),
  });
}

export async function confirmCheckout(
  input: CheckoutConfirmInput
): Promise<CheckoutConfirmResponse> {
  return request<CheckoutConfirmResponse>('/api/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function cancelSubscription(): Promise<{ ok: boolean; error?: string; message?: string }> {
  return request('/api/payments/cancel', {
    method: 'POST',
    body: JSON.stringify({ vertical: 'agenda' }),
  });
}
