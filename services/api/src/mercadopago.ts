const MERCADO_PAGO_API_BASE = 'https://api.mercadopago.com';

type MercadoPagoRequestOptions = {
    method: 'GET' | 'POST';
    body?: unknown;
    idempotencyKey?: string;
};

type MercadoPagoPreferenceResponse = {
    id: string;
    init_point?: string | null;
    sandbox_init_point?: string | null;
};

type MercadoPagoPreapprovalResponse = {
    id: string;
    init_point?: string | null;
    status?: string | null;
};

type MercadoPagoPaymentResponse = Record<string, unknown>;
type MercadoPagoSubscriptionResponse = Record<string, unknown>;

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function getAccessToken(): string {
    return asString(process.env.MERCADO_PAGO_ACCESS_TOKEN);
}

function getHeaders(idempotencyKey?: string): HeadersInit {
    const accessToken = getAccessToken();
    if (!accessToken) {
        throw new Error('Mercado Pago no está configurado. Falta MERCADO_PAGO_ACCESS_TOKEN.');
    }

    return {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
    };
}

function extractErrorMessage(payload: unknown, status: number): string {
    if (payload && typeof payload === 'object') {
        const asRecord = payload as Record<string, unknown>;
        const cause = Array.isArray(asRecord.cause) ? asRecord.cause[0] : null;
        if (cause && typeof cause === 'object') {
            const description = asString((cause as Record<string, unknown>).description);
            if (description) return description;
        }

        const message = asString(asRecord.message) || asString(asRecord.error);
        if (message) return message;
    }

    return `Mercado Pago respondió con estado ${status}.`;
}

async function requestMercadoPago<T>(path: string, options: MercadoPagoRequestOptions): Promise<T> {
    const response = await fetch(`${MERCADO_PAGO_API_BASE}${path}`, {
        method: options.method,
        headers: getHeaders(options.idempotencyKey),
        body: options.body == null ? undefined : JSON.stringify(options.body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(extractErrorMessage(payload, response.status));
    }

    return payload as T;
}

export function isMercadoPagoConfigured(): boolean {
    return getAccessToken().length > 0;
}

export async function createCheckoutPreference(input: {
    externalReference: string;
    title: string;
    description?: string;
    amount: number;
    currencyId: string;
    payerEmail: string;
    payerName?: string;
    backUrls: {
        success: string;
        failure: string;
        pending: string;
    };
    metadata?: Record<string, unknown>;
}): Promise<{ id: string; initPoint: string | null; sandboxInitPoint: string | null }> {
    const payload = await requestMercadoPago<MercadoPagoPreferenceResponse>('/checkout/preferences', {
        method: 'POST',
        idempotencyKey: input.externalReference,
        body: {
            items: [
                {
                    title: input.title,
                    description: input.description ?? input.title,
                    quantity: 1,
                    currency_id: input.currencyId,
                    unit_price: input.amount,
                },
            ],
            payer: {
                email: input.payerEmail,
                name: input.payerName,
            },
            back_urls: input.backUrls,
            auto_return: 'approved',
            external_reference: input.externalReference,
            metadata: input.metadata ?? {},
        },
    });

    return {
        id: payload.id,
        initPoint: payload.init_point ?? null,
        sandboxInitPoint: payload.sandbox_init_point ?? null,
    };
}

export async function getPaymentById(paymentId: string): Promise<MercadoPagoPaymentResponse> {
    return requestMercadoPago<MercadoPagoPaymentResponse>(`/v1/payments/${encodeURIComponent(paymentId)}`, {
        method: 'GET',
    });
}

export async function createPreapproval(input: {
    externalReference: string;
    reason: string;
    amount: number;
    currencyId: string;
    payerEmail: string;
    backUrl: string;
}): Promise<{ id: string; initPoint: string | null; status: string | null }> {
    const payload = await requestMercadoPago<MercadoPagoPreapprovalResponse>('/preapproval', {
        method: 'POST',
        idempotencyKey: input.externalReference,
        body: {
            reason: input.reason,
            external_reference: input.externalReference,
            payer_email: input.payerEmail,
            back_url: input.backUrl,
            status: 'pending',
            auto_recurring: {
                frequency: 1,
                frequency_type: 'months',
                transaction_amount: input.amount,
                currency_id: input.currencyId,
            },
        },
    });

    return {
        id: payload.id,
        initPoint: payload.init_point ?? null,
        status: payload.status ?? null,
    };
}

export async function getPreapprovalById(preapprovalId: string): Promise<MercadoPagoSubscriptionResponse> {
    return requestMercadoPago<MercadoPagoSubscriptionResponse>(`/preapproval/${encodeURIComponent(preapprovalId)}`, {
        method: 'GET',
    });
}
