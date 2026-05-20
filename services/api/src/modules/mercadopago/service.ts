import crypto from 'node:crypto';

const MERCADO_PAGO_API_BASE = 'https://api.mercadopago.com';

type MercadoPagoRequestOptions = {
    method: 'GET' | 'POST' | 'PUT';
    body?: unknown;
    idempotencyKey?: string;
    accessToken?: string;
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
    const token = options.accessToken ?? getAccessToken();
    if (!token) {
        throw new Error('Mercado Pago no está configurado. Falta MERCADO_PAGO_ACCESS_TOKEN.');
    }
    const headers: HeadersInit = {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.idempotencyKey ? { 'X-Idempotency-Key': options.idempotencyKey } : {}),
    };
    const response = await fetch(`${MERCADO_PAGO_API_BASE}${path}`, {
        method: options.method,
        headers,
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
    accessToken?: string; // professional's own MP token
    /** URL que Mercado Pago notifica cuando cambia el estado del pago (IPN). Debe ser HTTPS en producción. */
    notificationUrl?: string;
}): Promise<{ id: string; initPoint: string | null; sandboxInitPoint: string | null }> {
    const idempotencyKey = input.externalReference;
    const headers: HeadersInit = input.accessToken
        ? { Accept: 'application/json', Authorization: `Bearer ${input.accessToken}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}) }
        : getHeaders(idempotencyKey);

    const response = await fetch(`${MERCADO_PAGO_API_BASE}/checkout/preferences`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
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
            ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
        }),
    });

    const responsePayload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(extractErrorMessage(responsePayload, response.status));
    }
    const payload = responsePayload as MercadoPagoPreferenceResponse;

    return {
        id: payload.id,
        initPoint: payload.init_point ?? null,
        sandboxInitPoint: payload.sandbox_init_point ?? null,
    };
}

export async function getPaymentById(
    paymentId: string,
    options?: { accessToken?: string }
): Promise<MercadoPagoPaymentResponse> {
    return requestMercadoPago<MercadoPagoPaymentResponse>(`/v1/payments/${encodeURIComponent(paymentId)}`, {
        method: 'GET',
        accessToken: options?.accessToken,
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

export async function cancelPreapproval(preapprovalId: string): Promise<void> {
    await requestMercadoPago(`/preapproval/${encodeURIComponent(preapprovalId)}`, {
        method: 'PUT',
        body: { status: 'cancelled' },
    });
}

/**
 * Reembolsa un pago de Mercado Pago.
 * - Sin `amount` → reembolso total.
 * - Con `amount` → reembolso parcial (en la misma moneda del pago).
 * Idempotente: MP soporta `X-Idempotency-Key`.
 */
export async function refundPayment(input: {
    paymentId: string;
    amount?: number;
    idempotencyKey?: string;
}): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> | undefined =
        typeof input.amount === 'number' ? { amount: input.amount } : undefined;
    return requestMercadoPago<Record<string, unknown>>(
        `/v1/payments/${encodeURIComponent(input.paymentId)}/refunds`,
        {
            method: 'POST',
            idempotencyKey: input.idempotencyKey ?? `refund:${input.paymentId}`,
            body: body as unknown,
        }
    );
}

export type MercadoPagoWebhookSignatureResult = true | false | 'unsigned';

/**
 * Verifica la firma del webhook de Mercado Pago.
 *
 * Documentación: https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks
 *
 * - Producción sin `MERCADO_PAGO_WEBHOOK_SECRET` → `false` (rechazar webhook).
 * - Desarrollo sin secret → `'unsigned'` solo si `MERCADO_PAGO_WEBHOOK_ALLOW_UNSIGNED=true`.
 */
export function verifyMercadoPagoWebhookSignature(input: {
    xSignature: string | null | undefined;
    xRequestId: string | null | undefined;
    dataId: string | null | undefined;
}): MercadoPagoWebhookSignatureResult {
    const secret = asString(process.env.MERCADO_PAGO_WEBHOOK_SECRET);
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            return false;
        }
        if (process.env.MERCADO_PAGO_WEBHOOK_ALLOW_UNSIGNED === 'true') {
            return 'unsigned';
        }
        return false;
    }

    return verifyMercadoPagoWebhookSignatureWithSecret(secret, input);
}

export function verifyMercadoPagoWebhookSignatureWithSecret(
    secret: string,
    input: {
        xSignature: string | null | undefined;
        xRequestId: string | null | undefined;
        dataId: string | null | undefined;
    },
): true | false {
    const sig = asString(input.xSignature);
    const reqId = asString(input.xRequestId);
    const dataId = asString(input.dataId);
    if (!sig || !reqId || !dataId) return false;

    const parts = sig.split(',').map((p) => p.trim());
    const partsMap = new Map<string, string>();
    for (const p of parts) {
        const i = p.indexOf('=');
        if (i <= 0) continue;
        partsMap.set(p.slice(0, i), p.slice(i + 1));
    }
    const ts = partsMap.get('ts');
    const v1 = partsMap.get('v1');
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    if (expected.length !== v1.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'));
    } catch {
        return false;
    }
}

export function warnMercadoPagoWebhookSecretAtStartup(): void {
    if (process.env.NODE_ENV !== 'production') return;
    if (asString(process.env.MERCADO_PAGO_WEBHOOK_SECRET)) return;
    console.error(
        '[mercadopago] CRÍTICO: NODE_ENV=production sin MERCADO_PAGO_WEBHOOK_SECRET. '
        + 'Los webhooks de pago serán rechazados (401).',
    );
}
