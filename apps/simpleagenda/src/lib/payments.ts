const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

export type PaymentOrderStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'rejected'
  | 'cancelled'
  | 'refunded';

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  maxListings?: number;
  maxFeaturedListings?: number;
  analyticsEnabled?: boolean;
  crmEnabled?: boolean;
  prioritySupport?: boolean;
  recommended?: boolean;
};

export type PaymentOrderView = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  createdAt: string;
};

export type SubscriptionCatalogResponse = {
  ok: boolean;
  error?: string;
  mercadoPagoEnabled: boolean;
  plans: SubscriptionPlan[];
  freePlan: SubscriptionPlan | null;
  currentSubscription?: {
    id: string;
    planId: string;
    planName: string;
    status: string;
    expiresAt: string | null;
  } | null;
  orders: PaymentOrderView[];
};

export type CheckoutStartInput = {
  planId: 'free' | 'basic' | 'pro' | 'enterprise';
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
  paymentId?: string;
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
      planId: input.planId,
      returnUrl: input.returnUrl,
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
