import crypto from 'node:crypto';

const FINTOC_API_BASE = (process.env.FINTOC_API_BASE ?? 'https://api.fintoc.com/v2').replace(/\/$/, '');

export type FintocCheckoutFlow = 'payment' | 'subscription' | 'setup';

export type FintocCheckoutSession = {
    id: string;
    object?: string;
    mode?: string;
    status?: string | null;
    amount?: number | null;
    currency?: string | null;
    redirect_url?: string | null;
    checkout_url?: string | null;
    url?: string | null;
    success_url?: string | null;
    cancel_url?: string | null;
    metadata?: Record<string, unknown> | null;
    payment_intent?: string | Record<string, unknown> | null;
    subscription?: string | Record<string, unknown> | null;
};

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function getSecretKey(): string {
    return asString(process.env.FINTOC_SECRET_KEY);
}

function requestHeaders(idempotencyKey?: string): HeadersInit {
    const secretKey = getSecretKey();
    if (!secretKey) {
        throw new Error('Fintoc no está configurado. Falta FINTOC_SECRET_KEY.');
    }
    return {
        Accept: 'application/json',
        Authorization: secretKey,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    };
}

function extractErrorMessage(payload: unknown, status: number): string {
    if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>;
        const message = asString(record.message) || asString(record.error);
        if (message) return message;
    }
    return `Fintoc respondió con estado ${status}.`;
}

async function requestFintoc<T>(path: string, options: {
    method: 'GET' | 'POST';
    body?: unknown;
    idempotencyKey?: string;
}): Promise<T> {
    const response = await fetch(`${FINTOC_API_BASE}${path}`, {
        method: options.method,
        headers: requestHeaders(options.idempotencyKey),
        body: options.body == null ? undefined : JSON.stringify(options.body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(extractErrorMessage(payload, response.status));
    }
    return payload as T;
}

export function isFintocConfigured(): boolean {
    return getSecretKey().length > 0;
}

export function resolvePaymentsProvider(): 'fintoc' | 'mercadopago' {
    const requested = asString(process.env.PAYMENTS_PROVIDER).toLowerCase();
    if (requested === 'fintoc') return 'fintoc';
    if (requested === 'mercadopago') return 'mercadopago';
    if (process.env.FINTOC_ENABLED === 'true' && isFintocConfigured()) return 'fintoc';
    return 'mercadopago';
}

export async function createFintocCheckoutSession(input: {
    externalReference: string;
    flow?: FintocCheckoutFlow;
    amount: number;
    currency: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, unknown>;
    paymentMethodTypes?: Array<'bank_transfer' | 'card'>;
}): Promise<{ id: string; redirectUrl: string | null; status: string | null; payload: FintocCheckoutSession }> {
    const payload = await requestFintoc<FintocCheckoutSession>('/checkout_sessions', {
        method: 'POST',
        idempotencyKey: input.externalReference,
        body: {
            flow: input.flow ?? 'payment',
            ui_mode: 'hosted',
            amount: Math.round(input.amount),
            currency: input.currency,
            customer_email: input.customerEmail,
            success_url: input.successUrl,
            cancel_url: input.cancelUrl,
            metadata: {
                ...(input.metadata ?? {}),
                orderExternalId: input.externalReference,
                provider: 'fintoc',
            },
            ...(input.paymentMethodTypes?.length ? { payment_method_types: input.paymentMethodTypes } : {}),
        },
    });

    return {
        id: payload.id,
        redirectUrl: payload.redirect_url ?? payload.checkout_url ?? payload.url ?? null,
        status: payload.status ?? null,
        payload,
    };
}

export async function getFintocCheckoutSession(id: string): Promise<FintocCheckoutSession> {
    return requestFintoc<FintocCheckoutSession>(`/checkout_sessions/${encodeURIComponent(id)}`, {
        method: 'GET',
    });
}

export function parseFintocPaymentStatus(status: string): 'pending' | 'approved' | 'authorized' | 'rejected' | 'cancelled' {
    const normalized = status.trim().toLowerCase();
    if (['succeeded', 'success', 'paid', 'completed', 'finished', 'approved'].includes(normalized)) return 'approved';
    if (['authorized', 'active'].includes(normalized)) return 'authorized';
    if (['failed', 'rejected', 'error'].includes(normalized)) return 'rejected';
    if (['cancelled', 'canceled', 'expired'].includes(normalized)) return 'cancelled';
    return 'pending';
}

export function parseFintocSubscriptionStatus(status: string): 'pending' | 'authorized' | 'cancelled' {
    const parsed = parseFintocPaymentStatus(status);
    if (parsed === 'approved' || parsed === 'authorized') return 'authorized';
    if (parsed === 'cancelled' || parsed === 'rejected') return 'cancelled';
    return 'pending';
}

export function extractFintocEventData(event: Record<string, unknown>): Record<string, unknown> {
    const data = event.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>;
    return {};
}

export type FintocWebhookSignatureResult = true | false | 'unsigned';

export function verifyFintocWebhookSignature(input: {
    rawBody: string;
    signatureHeader: string | null | undefined;
}): FintocWebhookSignatureResult {
    const secret = asString(process.env.FINTOC_WEBHOOK_SECRET);
    if (!secret) {
        if (process.env.NODE_ENV === 'production') return false;
        return process.env.FINTOC_WEBHOOK_ALLOW_UNSIGNED === 'true' ? 'unsigned' : false;
    }

    const header = asString(input.signatureHeader);
    const parts = new Map(header.split(',').map((part) => {
        const [key, ...rest] = part.trim().split('=');
        return [key, rest.join('=')] as const;
    }));
    const timestamp = asString(parts.get('t'));
    const signature = asString(parts.get('v1'));
    if (!timestamp || !signature) return false;

    const toleranceMs = Number(process.env.FINTOC_WEBHOOK_TOLERANCE_MS ?? 5 * 60 * 1000);
    const timestampMs = Number(timestamp) * 1000;
    if (Number.isFinite(timestampMs) && Math.abs(Date.now() - timestampMs) > toleranceMs) {
        return false;
    }

    const expected = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${input.rawBody}`)
        .digest('hex');
    if (expected.length !== signature.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    } catch {
        return false;
    }
}
